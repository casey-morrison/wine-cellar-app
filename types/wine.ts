export type WineType = 'Red' | 'White' | 'Rosé' | 'Sparkling' | 'Dessert' | 'Fortified';

export interface Wine {
  id: string;
  producer: string;
  name: string;
  vintage: number | null;
  region: string;
  country: string;
  grape: string;
  type: WineType;
  quantity: number;
  imageUri: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TastingNote {
  id: string;
  wineId: string;
  score: number; // 0–10, half points allowed
  notes: string;
  tastedAt: string;
  createdAt: string;
}

export interface CriticScore {
  source: 'Wine Spectator' | 'Wine Advocate' | 'Vinous';
  score: number | null;
  maxScore: number;
  tastingNote?: string;
}

export interface PriceQuote {
  zip: string;
  averagePrice: number | null;
  currency: string;
  sampleSize: number;
  disclaimer: string;
}

export interface WineFilters {
  query: string;
  region: string | null;
  type: WineType | null;
  vintage: number | null;
  minRating: number | null;
  minQty: number | null;
}

export interface IdentifiedBottle {
  confidence: number;
  producer: string;
  name: string;
  vintage: number | null;
  region: string;
  country: string;
  grape: string;
  type: WineType;
  matchedWineId: string | null;
}

export interface AppSettings {
  zipCode: string;
  seeded: boolean;
}

export type WineWithMeta = Wine & {
  avgScore: number | null;
  tastingCount: number;
  otherVintages: { vintage: number | null; quantity: number; id: string }[];
};
