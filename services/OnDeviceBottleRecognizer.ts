import type { IdentifiedBottle, Wine, WineType } from '@/types/wine';
import type { BottleRecognizer } from '@/services/DemoBottleRecognizer';
import { combineConfidence, matchAgainstCatalog } from '@/services/catalogMatch';

export class OnDeviceRecognitionError extends Error {
  constructor(
    message: string,
    public readonly code: 'unavailable' | 'unsupported' | 'no_label' | 'ocr_failed'
  ) {
    super(message);
    this.name = 'OnDeviceRecognitionError';
  }
}

const TYPE_KEYWORDS: { type: WineType; patterns: RegExp[] }[] = [
  { type: 'Sparkling', patterns: [/\bsparkling\b/i, /\bchampagne\b/i, /\bprosecco\b/i, /\bcava\b/i, /\bbrut\b/i, /\bextra dry\b/i] },
  { type: 'Rosé', patterns: [/\bros[eé]\b/i, /\brosato\b/i] },
  { type: 'White', patterns: [/\bwhite\b/i, /\bblanc\b/i, /\bbianco\b/i] },
  { type: 'Dessert', patterns: [/\bdessert\b/i, /\blate harvest\b/i, /\bice wine\b/i, /\bsauternes\b/i] },
  { type: 'Fortified', patterns: [/\bfortified\b/i, /\bport\b/i, /\bsherry\b/i, /\bmadeira\b/i] },
  { type: 'Red', patterns: [/\bred\b/i, /\brouge\b/i, /\brosso\b/i] },
];

const GRAPE_KEYWORDS = [
  'Cabernet Sauvignon',
  'Cabernet Franc',
  'Pinot Noir',
  'Pinot Grigio',
  'Pinot Gris',
  'Sauvignon Blanc',
  'Chardonnay',
  'Merlot',
  'Syrah',
  'Shiraz',
  'Malbec',
  'Zinfandel',
  'Riesling',
  'Grenache',
  'Tempranillo',
  'Sangiovese',
  'Nebbiolo',
  'Barbera',
  'Gamay',
  'Viognier',
  'Chenin Blanc',
  'Gewürztraminer',
  'Moscato',
  'Muscat',
  'Petite Sirah',
  'Petit Verdot',
  'Carmenère',
];

const REGION_HINTS: { pattern: RegExp; region: string; country: string }[] = [
  { pattern: /\bnapa\b/i, region: 'Napa Valley', country: 'USA' },
  { pattern: /\bsonoma\b/i, region: 'Sonoma', country: 'USA' },
  { pattern: /\bwillamette\b/i, region: 'Willamette Valley', country: 'USA' },
  { pattern: /\bbordeaux\b/i, region: 'Bordeaux', country: 'France' },
  { pattern: /\bbourgogne\b|\bburgundy\b/i, region: 'Burgundy', country: 'France' },
  { pattern: /\bchampagne\b/i, region: 'Champagne', country: 'France' },
  { pattern: /\bprovence\b/i, region: 'Provence', country: 'France' },
  { pattern: /\brhone\b|\brhône\b/i, region: 'Rhône', country: 'France' },
  { pattern: /\btuscany\b|\btoscana\b/i, region: 'Tuscany', country: 'Italy' },
  { pattern: /\bpiemonte\b|\bpiedmont\b/i, region: 'Piedmont', country: 'Italy' },
  { pattern: /\brioja\b/i, region: 'Rioja', country: 'Spain' },
  { pattern: /\bpriorat\b/i, region: 'Priorat', country: 'Spain' },
  { pattern: /\bmarlborough\b/i, region: 'Marlborough', country: 'New Zealand' },
  { pattern: /\bbarossa\b/i, region: 'Barossa Valley', country: 'Australia' },
  { pattern: /\bmosel\b/i, region: 'Mosel', country: 'Germany' },
  { pattern: /\bdouro\b/i, region: 'Douro', country: 'Portugal' },
];

const NOISE_LINE =
  /^(alcohol|alc\.?|vol\.?|contains?|sulfites?|sulphites?|government|warning|net\s*contents?|ml\b|cl\b|%|produced|bottled|imported|estate|www\.|http|\d+\s*ml)/i;

type OcrApi = {
  recognizeText: (uri: string) => Promise<{ text: string; blocks: { text: string; lines: { text: string }[] }[] }>;
  isSupported: () => boolean;
};

function loadOcrApi(): OcrApi | null {
  try {
    // Native module is missing in Expo Go — require throws or recognizeText fails later.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-mlkit-ocr') as OcrApi;
    if (typeof mod?.recognizeText !== 'function') return null;
    return mod;
  } catch {
    return null;
  }
}

function collectLines(result: { text: string; blocks: { text: string; lines: { text: string }[] }[] }): string[] {
  const fromBlocks: string[] = [];
  for (const block of result.blocks ?? []) {
    for (const line of block.lines ?? []) {
      const t = (line.text || '').trim();
      if (t) fromBlocks.push(t);
    }
    if ((!block.lines || block.lines.length === 0) && block.text?.trim()) {
      fromBlocks.push(block.text.trim());
    }
  }
  if (fromBlocks.length > 0) return fromBlocks;
  return (result.text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function extractVintage(lines: string[], fullText: string): number | null {
  const yearRe = /\b((?:19|20)\d{2})\b/g;
  const years: number[] = [];
  const scan = `${lines.join('\n')}\n${fullText}`;
  let m: RegExpExecArray | null;
  while ((m = yearRe.exec(scan)) !== null) {
    const y = parseInt(m[1], 10);
    if (y >= 1900 && y <= 2035) years.push(y);
  }
  if (years.length === 0) return null;
  // Prefer a year that appears on its own line (common on labels)
  for (const line of lines) {
    const alone = line.match(/^\s*((?:19|20)\d{2})\s*$/);
    if (alone) {
      const y = parseInt(alone[1], 10);
      if (y >= 1900 && y <= 2035) return y;
    }
  }
  return years[0];
}

function detectType(fullText: string): WineType {
  for (const { type, patterns } of TYPE_KEYWORDS) {
    if (patterns.some((p) => p.test(fullText))) return type;
  }
  return 'Red';
}

function detectGrape(fullText: string): string {
  const lower = fullText.toLowerCase();
  for (const g of GRAPE_KEYWORDS) {
    if (lower.includes(g.toLowerCase())) return g;
  }
  return '';
}

function detectRegion(fullText: string): { region: string; country: string } {
  for (const hint of REGION_HINTS) {
    if (hint.pattern.test(fullText)) {
      return { region: hint.region, country: hint.country };
    }
  }
  return { region: '', country: '' };
}

function isUsefulLabelLine(line: string, vintage: number | null): boolean {
  const t = line.trim();
  if (!t || t.length < 2) return false;
  if (NOISE_LINE.test(t)) return false;
  if (vintage != null && /^\s*\d{4}\s*$/.test(t)) return false;
  if (/^\d+([.,]\d+)?\s*%/.test(t)) return false;
  if (TYPE_KEYWORDS.some(({ patterns }) => patterns.some((p) => p.test(t)) && t.length < 16)) {
    // Pure type words like "Red Wine" are weak as producer/name
    if (/^(red|white|ros[eé]|sparkling|wine)\b/i.test(t) && t.split(/\s+/).length <= 3) return false;
  }
  return true;
}

export function parseLabelText(rawText: string, linesIn?: string[]): {
  producer: string;
  name: string;
  vintage: number | null;
  region: string;
  country: string;
  grape: string;
  type: WineType;
  certainty: number;
} {
  const lines =
    linesIn?.map((l) => l.trim()).filter(Boolean) ??
    rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

  const fullText = lines.join('\n') || rawText;
  const vintage = extractVintage(lines, fullText);
  const type = detectType(fullText);
  const grape = detectGrape(fullText);
  const { region, country } = detectRegion(fullText);

  const useful = lines.filter((l) => isUsefulLabelLine(l, vintage));
  // Prefer longer / upper-ish lines near the top as producer
  const ranked = [...useful].sort((a, b) => {
    const ai = useful.indexOf(a);
    const bi = useful.indexOf(b);
    // Earlier lines win; slight boost for longer lines
    return ai - bi || b.length - a.length;
  });

  let producer = ranked[0] ?? '';
  let name = ranked[1] ?? '';

  // If second line looks like a grape and first is producer, keep; if only one useful line, use grape as name fallback
  if (!name && grape) name = grape;
  if (!producer && name) {
    producer = name;
    name = grape || name;
  }

  // Drop grape-only duplicate as name when producer already holds it
  if (name && producer && name.toLowerCase() === producer.toLowerCase() && grape) {
    name = grape;
  }

  let certainty = 0.45;
  if (producer) certainty += 0.18;
  if (name) certainty += 0.12;
  if (vintage != null) certainty += 0.1;
  if (grape) certainty += 0.05;
  if (region) certainty += 0.05;
  if (lines.length >= 3) certainty += 0.05;
  certainty = Math.max(0.35, Math.min(0.92, certainty));

  return {
    producer: producer || 'Unknown',
    name: name || grape || producer || 'Unknown',
    vintage,
    region,
    country,
    grape,
    type,
    certainty,
  };
}

export class OnDeviceBottleRecognizer implements BottleRecognizer {
  async identifyFromImage(imageUri: string, catalog: Wine[]): Promise<IdentifiedBottle> {
    const api = loadOcrApi();
    if (!api) {
      throw new OnDeviceRecognitionError(
        'On-device OCR is not available in Expo Go. Install a development build (see Settings → How to install, or the README), or enable “Prefer cloud vision” with an OpenAI key / demo recognition for testing.',
        'unavailable'
      );
    }

    try {
      if (typeof api.isSupported === 'function' && !api.isSupported()) {
        throw new OnDeviceRecognitionError(
          'On-device OCR requires iOS 16+ (or Android 5+). Update the device, or use cloud vision / demo recognition in Settings.',
          'unsupported'
        );
      }
    } catch (e) {
      if (e instanceof OnDeviceRecognitionError) throw e;
      throw new OnDeviceRecognitionError(
        'On-device OCR is not available in Expo Go. Install a development build (see README), or enable cloud vision / demo recognition in Settings.',
        'unavailable'
      );
    }

    let result: { text: string; blocks: { text: string; lines: { text: string }[] }[] };
    try {
      result = await api.recognizeText(imageUri);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/native module|ExpoMlkitOcr|Cannot find|not supported on web/i.test(msg)) {
        throw new OnDeviceRecognitionError(
          'On-device OCR native module missing. Expo Go is not enough — use a development build (EAS Build or npx expo run:ios). See README.',
          'unavailable'
        );
      }
      throw new OnDeviceRecognitionError(
        `On-device OCR failed: ${msg}. Try a clearer label photo, or enable cloud vision in Settings.`,
        'ocr_failed'
      );
    }

    const lines = collectLines(result);
    const fullText = (result.text || lines.join('\n')).trim();
    if (!fullText || lines.length === 0) {
      throw new OnDeviceRecognitionError(
        'No readable wine label text found. Try a sharper, well-lit photo of the front label.',
        'no_label'
      );
    }

    const extracted = parseLabelText(fullText, lines);
    if (
      (!extracted.producer || extracted.producer === 'Unknown') &&
      (!extracted.name || extracted.name === 'Unknown')
    ) {
      throw new OnDeviceRecognitionError(
        'No readable wine label text found. Try a sharper, well-lit photo of the front label.',
        'no_label'
      );
    }

    const match = matchAgainstCatalog(
      {
        producer: extracted.producer,
        name: extracted.name,
        vintage: extracted.vintage,
      },
      catalog
    );

    return {
      confidence: combineConfidence(extracted.certainty, match),
      producer: extracted.producer || match.wine?.producer || 'Unknown',
      name: extracted.name || match.wine?.name || 'Unknown',
      vintage: extracted.vintage ?? match.wine?.vintage ?? null,
      region: extracted.region || match.wine?.region || '',
      country: extracted.country || match.wine?.country || '',
      grape: extracted.grape || match.wine?.grape || '',
      type: extracted.type || match.wine?.type || 'Red',
      matchedWineId: match.wine?.id ?? null,
    };
  }
}

export function createOnDeviceBottleRecognizer(): OnDeviceBottleRecognizer {
  return new OnDeviceBottleRecognizer();
}

export const onDeviceBottleRecognizer = new OnDeviceBottleRecognizer();
