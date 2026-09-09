import * as FileSystem from 'expo-file-system/legacy';
import type { IdentifiedBottle, Wine, WineType } from '@/types/wine';
import type { BottleRecognizer } from '@/services/DemoBottleRecognizer';
import { combineConfidence, matchAgainstCatalog } from '@/services/catalogMatch';

const WINE_TYPES: WineType[] = ['Red', 'White', 'Rosé', 'Sparkling', 'Dessert', 'Fortified'];

export class VisionRecognitionError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'no_key'
      | 'invalid_key'
      | 'network'
      | 'no_label'
      | 'parse'
      | 'api'
  ) {
    super(message);
    this.name = 'VisionRecognitionError';
  }
}

interface VisionBottleRecognizerOptions {
  apiKey: string;
  model?: string;
}

interface LabelExtraction {
  producer: string;
  name: string;
  vintage: number | null;
  region: string;
  country: string;
  grape: string;
  type: WineType;
  certainty: number;
  labelTextFound: boolean;
}

const SYSTEM_PROMPT = `You are a wine-label OCR expert. Extract fields from the bottle label image.
Return ONLY valid JSON (no markdown) with this exact shape:
{
  "producer": string,
  "name": string,
  "vintage": number | null,
  "region": string,
  "country": string,
  "grape": string,
  "type": "Red" | "White" | "Rosé" | "Sparkling" | "Dessert" | "Fortified",
  "certainty": number,
  "labelTextFound": boolean
}
Rules:
- producer: winery / château / domaine / brand on the label
- name: cuvée / vineyard designation / wine name (not just the grape if a proper name exists)
- vintage: 4-digit year if printed, else null for NV
- region / country / grape: best effort from the label; empty string if unknown
- type: best guess from color/style cues on the label
- certainty: 0–1 how sure you are the OCR/fields are correct
- labelTextFound: false if the image is blank, not a wine label, or unreadable
- Do not invent famous wines that are not supported by visible text. Prefer empty strings over guesses when text is missing.`;


function bytesToBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;
    out += chars[(triple >> 18) & 63];
    out += chars[(triple >> 12) & 63];
    out += i + 1 < bytes.length ? chars[(triple >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? chars[triple & 63] : '=';
  }
  return out;
}

function guessMime(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.gif')) return 'image/gif';
  return 'image/jpeg';
}

async function readImageAsBase64(imageUri: string): Promise<{ base64: string; mime: string }> {
  const mime = guessMime(imageUri);
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (base64?.length) {
      return { base64, mime };
    }
  } catch {
    // Fall through to fetch (helps with some content:// / http URIs)
  }

  try {
    const response = await fetch(imageUri);
    if (!response.ok) {
      throw new Error(`fetch status ${response.status}`);
    }
    const contentType = response.headers.get('content-type') || mime;
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const base64 = bytesToBase64(bytes);
    return { base64, mime: contentType.startsWith('image/') ? contentType : mime };
  } catch (e) {
    throw new VisionRecognitionError(
      'Could not read the bottle photo. Try taking or picking the image again.',
      'parse'
    );
  }
}

function coerceType(raw: unknown): WineType {
  if (typeof raw === 'string') {
    const hit = WINE_TYPES.find((t) => t.toLowerCase() === raw.toLowerCase());
    if (hit) return hit;
    if (raw.toLowerCase().includes('rose') || raw.toLowerCase().includes('rosé')) return 'Rosé';
    if (raw.toLowerCase().includes('spark')) return 'Sparkling';
    if (raw.toLowerCase().includes('white')) return 'White';
    if (raw.toLowerCase().includes('dessert')) return 'Dessert';
    if (raw.toLowerCase().includes('fortif')) return 'Fortified';
  }
  return 'Red';
}

function coerceVintage(raw: unknown): number | null {
  if (raw == null || raw === '' || raw === 'NV' || raw === 'nv') return null;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw).replace(/[^\d]/g, ''), 10);
  if (!Number.isFinite(n) || n < 1800 || n > 2100) return null;
  return n;
}

function parseExtraction(content: string): LabelExtraction {
  let parsed: Record<string, unknown>;
  try {
    const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    parsed = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    throw new VisionRecognitionError(
      'Vision response was not valid JSON. Try again with a clearer label photo.',
      'parse'
    );
  }

  const labelTextFound = parsed.labelTextFound !== false;
  const producer = String(parsed.producer ?? '').trim();
  const name = String(parsed.name ?? '').trim();
  const certaintyRaw = typeof parsed.certainty === 'number' ? parsed.certainty : 0.5;

  return {
    producer,
    name,
    vintage: coerceVintage(parsed.vintage),
    region: String(parsed.region ?? '').trim(),
    country: String(parsed.country ?? '').trim(),
    grape: String(parsed.grape ?? '').trim(),
    type: coerceType(parsed.type),
    certainty: Math.max(0, Math.min(1, certaintyRaw)),
    labelTextFound: labelTextFound && (!!producer || !!name),
  };
}

export class VisionBottleRecognizer implements BottleRecognizer {
  private apiKey: string;
  private model: string;

  constructor(options: VisionBottleRecognizerOptions) {
    this.apiKey = options.apiKey.trim();
    this.model = (options.model || 'gpt-4o-mini').trim() || 'gpt-4o-mini';
  }

  async identifyFromImage(imageUri: string, catalog: Wine[]): Promise<IdentifiedBottle> {
    if (!this.apiKey) {
      throw new VisionRecognitionError(
        'Add an OpenAI API key in Settings to identify bottles.',
        'no_key'
      );
    }

    const { base64, mime } = await readImageAsBase64(imageUri);
    const dataUrl = `data:${mime};base64,${base64}`;

    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract wine label fields from this bottle photo as JSON.',
                },
                {
                  type: 'image_url',
                  image_url: { url: dataUrl, detail: 'high' },
                },
              ],
            },
          ],
        }),
      });
    } catch {
      throw new VisionRecognitionError(
        'Network error talking to OpenAI. Check your connection and try again.',
        'network'
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new VisionRecognitionError(
        'OpenAI rejected the API key. Check the key in Settings (platform.openai.com).',
        'invalid_key'
      );
    }

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const errBody = (await response.json()) as { error?: { message?: string } };
        if (errBody?.error?.message) detail = errBody.error.message;
      } catch {
        // ignore
      }
      throw new VisionRecognitionError(`OpenAI vision failed: ${detail}`, 'api');
    }

    const body = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      throw new VisionRecognitionError('OpenAI returned an empty vision response.', 'api');
    }

    const extracted = parseExtraction(content);
    if (!extracted.labelTextFound || (!extracted.producer && !extracted.name)) {
      throw new VisionRecognitionError(
        'No readable wine label text found. Try a sharper, well-lit photo of the front label.',
        'no_label'
      );
    }

    const match = matchAgainstCatalog(
      {
        producer: extracted.producer,
        name: extracted.name || extracted.grape || 'Unknown',
        vintage: extracted.vintage,
      },
      catalog
    );

    const identified: IdentifiedBottle = {
      confidence: combineConfidence(extracted.certainty, match),
      producer: extracted.producer || match.wine?.producer || 'Unknown',
      name: extracted.name || extracted.grape || match.wine?.name || 'Unknown',
      vintage: extracted.vintage ?? match.wine?.vintage ?? null,
      region: extracted.region || match.wine?.region || '',
      country: extracted.country || match.wine?.country || '',
      grape: extracted.grape || match.wine?.grape || '',
      type: extracted.type || match.wine?.type || 'Red',
      matchedWineId: match.wine?.id ?? null,
    };

    if (identified.confidence < 0.58 && !identified.matchedWineId) {
      // Still return so confirm can create a new wine, but surface via confidence on confirm.
    }

    return identified;
  }
}

export function createVisionBottleRecognizer(apiKey: string, model?: string): VisionBottleRecognizer {
  return new VisionBottleRecognizer({ apiKey, model });
}
