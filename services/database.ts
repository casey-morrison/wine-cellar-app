import AsyncStorage from '@react-native-async-storage/async-storage';
import { SEED_TASTINGS, SEED_WINES } from '@/data/seedWines';
import type { AppSettings, TastingNote, Wine, WineFilters, WineType } from '@/types/wine';

const KEYS = {
  wines: '@winecellar/wines',
  tastings: '@winecellar/tastings',
  settings: '@winecellar/settings',
} as const;

const DEFAULT_SETTINGS: AppSettings = {
  zipCode: '94102',
  seeded: false,
  openaiApiKey: '',
  recognitionModel: 'gpt-4o-mini',
  useDemoRecognition: false,
  preferCloudVision: false,
};

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function getSettings(): Promise<AppSettings> {
  const raw = await readJson<Partial<AppSettings>>(KEYS.settings, DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...raw };
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await writeJson(KEYS.settings, next);
  return next;
}

export async function ensureSeeded(): Promise<void> {
  const settings = await getSettings();
  if (settings.seeded) return;

  const existing = await readJson<Wine[]>(KEYS.wines, []);
  if (existing.length > 0) {
    await updateSettings({ seeded: true });
    return;
  }

  const ts = nowIso();
  const wines: Wine[] = SEED_WINES.map((w) => ({
    ...w,
    createdAt: ts,
    updatedAt: ts,
  }));
  const tastings: TastingNote[] = SEED_TASTINGS.map((t) => ({
    ...t,
    createdAt: t.tastedAt,
  }));

  await writeJson(KEYS.wines, wines);
  await writeJson(KEYS.tastings, tastings);
  await updateSettings({ seeded: true });
}

export async function resetSampleData(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.wines, KEYS.tastings]);
  await updateSettings({ seeded: false });
  await ensureSeeded();
}

export async function getAllWines(): Promise<Wine[]> {
  await ensureSeeded();
  const wines = await readJson<Wine[]>(KEYS.wines, []);
  return wines.sort((a, b) => {
    const pa = a.producer.localeCompare(b.producer);
    if (pa !== 0) return pa;
    const na = a.name.localeCompare(b.name);
    if (na !== 0) return na;
    return (b.vintage ?? 0) - (a.vintage ?? 0);
  });
}

export async function getWineById(id: string): Promise<Wine | null> {
  const wines = await getAllWines();
  return wines.find((w) => w.id === id) ?? null;
}

export async function getRelatedVintages(
  wine: Pick<Wine, 'id' | 'producer' | 'name'>
): Promise<Wine[]> {
  const wines = await getAllWines();
  return wines.filter(
    (w) =>
      w.id !== wine.id &&
      w.producer.toLowerCase() === wine.producer.toLowerCase() &&
      w.name.toLowerCase() === wine.name.toLowerCase()
  );
}

export async function filterWines(filters: WineFilters): Promise<Wine[]> {
  let wines = await getAllWines();
  const q = filters.query.trim().toLowerCase();

  if (q) {
    wines = wines.filter(
      (w) =>
        w.producer.toLowerCase().includes(q) ||
        w.name.toLowerCase().includes(q) ||
        w.region.toLowerCase().includes(q) ||
        w.grape.toLowerCase().includes(q) ||
        w.country.toLowerCase().includes(q) ||
        String(w.vintage ?? '').includes(q)
    );
  }
  if (filters.region) {
    const r = filters.region.toLowerCase();
    wines = wines.filter(
      (w) => w.region.toLowerCase().includes(r) || w.country.toLowerCase().includes(r)
    );
  }
  if (filters.type) {
    wines = wines.filter((w) => w.type === filters.type);
  }
  if (filters.vintage != null) {
    wines = wines.filter((w) => w.vintage === filters.vintage);
  }
  if (filters.minQty != null) {
    wines = wines.filter((w) => w.quantity >= filters.minQty!);
  }
  if (filters.minRating != null) {
    const tastings = await getAllTastings();
    const avg = new Map<string, number>();
    const counts = new Map<string, number>();
    for (const t of tastings) {
      counts.set(t.wineId, (counts.get(t.wineId) ?? 0) + 1);
      avg.set(t.wineId, (avg.get(t.wineId) ?? 0) + t.score);
    }
    wines = wines.filter((w) => {
      const c = counts.get(w.id);
      if (!c) return false;
      return avg.get(w.id)! / c >= filters.minRating!;
    });
  }
  return wines;
}

export async function upsertWine(
  input: Omit<Wine, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<Wine> {
  const wines = await getAllWines();
  const ts = nowIso();
  if (input.id) {
    const idx = wines.findIndex((w) => w.id === input.id);
    if (idx >= 0) {
      const updated: Wine = { ...wines[idx], ...input, id: input.id, updatedAt: ts };
      wines[idx] = updated;
      await writeJson(KEYS.wines, wines);
      return updated;
    }
  }
  const wine: Wine = {
    id: input.id ?? uid('w'),
    producer: input.producer,
    name: input.name,
    vintage: input.vintage,
    region: input.region,
    country: input.country,
    grape: input.grape,
    type: input.type,
    quantity: input.quantity,
    imageUri: input.imageUri,
    notes: input.notes,
    createdAt: ts,
    updatedAt: ts,
  };
  wines.push(wine);
  await writeJson(KEYS.wines, wines);
  return wine;
}

export async function adjustQuantity(id: string, delta: number): Promise<Wine | null> {
  const wines = await getAllWines();
  const idx = wines.findIndex((w) => w.id === id);
  if (idx < 0) return null;
  wines[idx] = {
    ...wines[idx],
    quantity: Math.max(0, wines[idx].quantity + delta),
    updatedAt: nowIso(),
  };
  await writeJson(KEYS.wines, wines);
  return wines[idx];
}

export async function deleteWine(id: string): Promise<void> {
  const wines = await getAllWines();
  await writeJson(
    KEYS.wines,
    wines.filter((w) => w.id !== id)
  );
  const tastings = await getAllTastings();
  await writeJson(
    KEYS.tastings,
    tastings.filter((t) => t.wineId !== id)
  );
}

export async function getAllTastings(): Promise<TastingNote[]> {
  await ensureSeeded();
  return readJson<TastingNote[]>(KEYS.tastings, []);
}

export async function getTastingsForWine(wineId: string): Promise<TastingNote[]> {
  const all = await getAllTastings();
  return all
    .filter((t) => t.wineId === wineId)
    .sort((a, b) => b.tastedAt.localeCompare(a.tastedAt));
}

export async function addTasting(input: {
  wineId: string;
  score: number;
  notes: string;
  tastedAt?: string;
}): Promise<TastingNote> {
  const tastings = await getAllTastings();
  const note: TastingNote = {
    id: uid('t'),
    wineId: input.wineId,
    score: Math.round(input.score * 2) / 2,
    notes: input.notes,
    tastedAt: input.tastedAt ?? nowIso(),
    createdAt: nowIso(),
  };
  tastings.push(note);
  await writeJson(KEYS.tastings, tastings);
  return note;
}

export async function deleteTasting(id: string): Promise<void> {
  const tastings = await getAllTastings();
  await writeJson(
    KEYS.tastings,
    tastings.filter((t) => t.id !== id)
  );
}

export async function getCatalogStats(): Promise<{
  bottles: number;
  distinctWines: number;
  regions: string[];
  types: WineType[];
}> {
  const wines = await getAllWines();
  const regions = [...new Set(wines.map((w) => w.country))].sort();
  const types = [...new Set(wines.map((w) => w.type))] as WineType[];
  return {
    bottles: wines.reduce((s, w) => s + w.quantity, 0),
    distinctWines: wines.length,
    regions,
    types,
  };
}

export function averageScore(tastings: TastingNote[]): number | null {
  if (tastings.length === 0) return null;
  const sum = tastings.reduce((s, t) => s + t.score, 0);
  return Math.round((sum / tastings.length) * 10) / 10;
}
