import type { IdentifiedBottle, Wine, WineType } from '@/types/wine';

/**
 * Demo bottle recognizer — simulates label OCR / vision matching (URI-hash stub).
 * Kept for offline testing via Settings → “Use demo recognition”.
 * Production Identify uses VisionBottleRecognizer when an OpenAI key is set.
 */
export interface BottleRecognizer {
  identifyFromImage(imageUri: string, catalog: Wine[]): Promise<IdentifiedBottle>;
}

const FALLBACK_CANDIDATES: Omit<IdentifiedBottle, 'confidence' | 'matchedWineId'>[] = [
  {
    producer: 'Caymus',
    name: 'Special Selection Cabernet Sauvignon',
    vintage: 2020,
    region: 'Napa Valley',
    country: 'USA',
    grape: 'Cabernet Sauvignon',
    type: 'Red' as WineType,
  },
  {
    producer: 'Cloudy Bay',
    name: 'Sauvignon Blanc',
    vintage: 2023,
    region: 'Marlborough',
    country: 'New Zealand',
    grape: 'Sauvignon Blanc',
    type: 'White' as WineType,
  },
  {
    producer: 'Whispering Angel',
    name: 'Rosé',
    vintage: 2023,
    region: 'Provence',
    country: 'France',
    grape: 'Grenache Blend',
    type: 'Rosé' as WineType,
  },
  {
    producer: 'Opus One',
    name: 'Opus One',
    vintage: 2018,
    region: 'Napa Valley',
    country: 'USA',
    grape: 'Bordeaux Blend',
    type: 'Red' as WineType,
  },
  {
    producer: 'Dom Pérignon',
    name: 'Vintage',
    vintage: 2013,
    region: 'Champagne',
    country: 'France',
    grape: 'Chardonnay / Pinot Noir',
    type: 'Sparkling' as WineType,
  },
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function findCatalogMatch(
  candidate: { producer: string; name: string; vintage: number | null },
  catalog: Wine[]
): Wine | null {
  const p = normalize(candidate.producer);
  const n = normalize(candidate.name);
  return (
    catalog.find(
      (w) =>
        normalize(w.producer) === p &&
        normalize(w.name) === n &&
        w.vintage === candidate.vintage
    ) ??
    catalog.find((w) => normalize(w.producer) === p && normalize(w.name) === n) ??
    null
  );
}

export class DemoBottleRecognizer implements BottleRecognizer {
  async identifyFromImage(imageUri: string, catalog: Wine[]): Promise<IdentifiedBottle> {
    // Simulate vision latency
    await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));

    // Prefer matching something already in the cellar so the "how many bottles" flow shines
    const inStock = catalog.filter((w) => w.quantity > 0);
    const pool = inStock.length > 0 ? inStock : catalog;

    let pick: Wine | null = null;
    if (pool.length > 0) {
      // Stable-ish pick from image URI hash
      let h = 0;
      for (let i = 0; i < imageUri.length; i++) h = (h * 31 + imageUri.charCodeAt(i)) | 0;
      pick = pool[Math.abs(h) % pool.length];
    }

    if (pick) {
      return {
        confidence: 0.82 + (Math.abs(hash(imageUri)) % 15) / 100,
        producer: pick.producer,
        name: pick.name,
        vintage: pick.vintage,
        region: pick.region,
        country: pick.country,
        grape: pick.grape,
        type: pick.type,
        matchedWineId: pick.id,
      };
    }

    const fb = FALLBACK_CANDIDATES[Math.abs(hash(imageUri)) % FALLBACK_CANDIDATES.length];
    const match = findCatalogMatch(fb, catalog);
    return {
      ...fb,
      confidence: 0.74,
      matchedWineId: match?.id ?? null,
    };
  }
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

export const demoBottleRecognizer = new DemoBottleRecognizer();
