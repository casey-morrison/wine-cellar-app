import type { CriticScore, PriceQuote, Wine } from '@/types/wine';

/**
 * Demo metadata provider — returns plausible critic scores and retail prices.
 * Swap this implementation for a live API client later (same interface).
 */
export interface WineMetadataProvider {
  getCriticScores(wine: Pick<Wine, 'producer' | 'name' | 'vintage'>): Promise<CriticScore[]>;
  getAverageRetailPrice(
    wine: Pick<Wine, 'producer' | 'name' | 'vintage' | 'type'>,
    zipCode: string
  ): Promise<PriceQuote>;
}

/** Deterministic pseudo-random from string so demo data is stable across launches */
function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function scoreInRange(seed: number, min: number, max: number): number {
  return min + (seed % (max - min + 1));
}

const TYPE_BASE_PRICE: Record<string, number> = {
  Red: 85,
  White: 55,
  Rosé: 28,
  Sparkling: 120,
  Dessert: 150,
  Fortified: 90,
};

export class DemoProvider implements WineMetadataProvider {
  async getCriticScores(
    wine: Pick<Wine, 'producer' | 'name' | 'vintage'>
  ): Promise<CriticScore[]> {
    const key = `${wine.producer}|${wine.name}|${wine.vintage ?? 'NV'}`;
    const h = hashString(key);

    // Prestige producers get higher bands
    const prestige =
      /margaux|opus|screaming|romanée|leflaive|grange|yquem|krug|dom pérignon|pingus|vega|insignia|monte bello/i.test(
        `${wine.producer} ${wine.name}`
      );

    const ws = prestige ? scoreInRange(h, 92, 98) : scoreInRange(h, 86, 94);
    const wa = prestige ? scoreInRange(h >> 3, 93, 99) : scoreInRange(h >> 3, 87, 95);
    const vinous = prestige ? scoreInRange(h >> 5, 92, 97) : scoreInRange(h >> 5, 88, 94);

    // Occasionally omit one source for realism
    const includeWA = h % 7 !== 0;
    const includeVinous = h % 11 !== 0;

    const scores: CriticScore[] = [
      {
        source: 'Wine Spectator',
        score: ws,
        maxScore: 100,
        tastingNote: prestige
          ? 'Dense and polished with remarkable length.'
          : 'Well-crafted with attractive fruit and balance.',
      },
    ];
    if (includeWA) {
      scores.push({
        source: 'Wine Advocate',
        score: wa,
        maxScore: 100,
        tastingNote: 'Layered aromatics; fine tannins.',
      });
    }
    if (includeVinous) {
      scores.push({
        source: 'Vinous',
        score: vinous,
        maxScore: 100,
        tastingNote: 'Energy and precision; drinking window open.',
      });
    }
    return scores;
  }

  async getAverageRetailPrice(
    wine: Pick<Wine, 'producer' | 'name' | 'vintage' | 'type'>,
    zipCode: string
  ): Promise<PriceQuote> {
    const key = `${wine.producer}|${wine.name}|${wine.vintage ?? 'NV'}|${zipCode}`;
    const h = hashString(key);
    const base = TYPE_BASE_PRICE[wine.type] ?? 60;

    const prestigeBoost =
      /margaux|opus|screaming|romanée|leflaive|grange|yquem|krug|dom pérignon|pingus|vega|insignia|monte bello|único/i.test(
        `${wine.producer} ${wine.name}`
      )
        ? 4 + (h % 8)
        : 1;

    const vintageAdj = wine.vintage && wine.vintage < 2016 ? 1.15 : 1;
    const zipAdj = 0.9 + ((h % 20) / 100); // mild ZIP variance
    const averagePrice = Math.round(base * prestigeBoost * vintageAdj * zipAdj);

    return {
      zip: zipCode,
      averagePrice,
      currency: 'USD',
      sampleSize: 3 + (h % 8),
      disclaimer:
        'Demo estimate only — not live retailer data. Replace DemoProvider with a real price API.',
    };
  }
}

export const demoProvider = new DemoProvider();
