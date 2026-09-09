import type { Wine } from '@/types/wine';

export function normalizeWineText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export type CatalogMatchQuality = 'exact' | 'producer_name' | 'producer_partial' | 'none';

export interface CatalogMatchResult {
  wine: Wine | null;
  quality: CatalogMatchQuality;
  /** 0–1 contribution from catalog match alone */
  matchScore: number;
}

/**
 * Fuzzy-match OCR fields against the cellar catalog.
 * Prefer producer+name+vintage, then producer+name, then producer+partial name.
 */
export function matchAgainstCatalog(
  candidate: { producer: string; name: string; vintage: number | null },
  catalog: Wine[]
): CatalogMatchResult {
  const p = normalizeWineText(candidate.producer);
  const n = normalizeWineText(candidate.name);
  if (!p && !n) {
    return { wine: null, quality: 'none', matchScore: 0 };
  }

  if (p && n) {
    const exact = catalog.find(
      (w) =>
        normalizeWineText(w.producer) === p &&
        normalizeWineText(w.name) === n &&
        w.vintage === candidate.vintage
    );
    if (exact) {
      return { wine: exact, quality: 'exact', matchScore: 1 };
    }

    const byProducerName = catalog.find(
      (w) => normalizeWineText(w.producer) === p && normalizeWineText(w.name) === n
    );
    if (byProducerName) {
      return { wine: byProducerName, quality: 'producer_name', matchScore: 0.88 };
    }
  }

  if (p) {
    const producerWines = catalog.filter((w) => normalizeWineText(w.producer) === p);
    if (producerWines.length > 0 && n) {
      const partial =
        producerWines.find((w) => {
          const wn = normalizeWineText(w.name);
          return wn.includes(n) || n.includes(wn);
        }) ??
        producerWines.find((w) => {
          const wn = normalizeWineText(w.name);
          const tokens = n.split(' ').filter((t) => t.length > 2);
          return tokens.length > 0 && tokens.every((t) => wn.includes(t));
        });
      if (partial) {
        return { wine: partial, quality: 'producer_partial', matchScore: 0.72 };
      }
    }
  }

  return { wine: null, quality: 'none', matchScore: 0 };
}

/** Combine model certainty (0–1) with catalog match into a display confidence in ~0.55–0.95. */
export function combineConfidence(
  modelCertainty: number,
  match: CatalogMatchResult
): number {
  const certainty = Math.max(0, Math.min(1, modelCertainty));
  let base: number;
  switch (match.quality) {
    case 'exact':
      base = 0.78 + certainty * 0.17;
      break;
    case 'producer_name':
      base = 0.7 + certainty * 0.18;
      break;
    case 'producer_partial':
      base = 0.6 + certainty * 0.18;
      break;
    default:
      base = 0.55 + certainty * 0.2;
      break;
  }
  return Math.round(Math.max(0.55, Math.min(0.95, base)) * 100) / 100;
}
