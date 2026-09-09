import { useCallback, useEffect, useState } from 'react';
import {
  addTasting,
  adjustQuantity,
  deleteTasting,
  deleteWine,
  ensureSeeded,
  filterWines,
  getAllTastings,
  getCatalogStats,
  getRelatedVintages,
  getSettings,
  getTastingsForWine,
  getWineById,
  resetSampleData,
  updateSettings,
  upsertWine,
} from '@/services/database';
import type { AppSettings, TastingNote, Wine, WineFilters } from '@/types/wine';

const emptyFilters: WineFilters = {
  query: '',
  region: null,
  type: null,
  vintage: null,
  minRating: null,
  minQty: null,
};

export function useCellar() {
  const [wines, setWines] = useState<Wine[]>([]);
  const [filters, setFilters] = useState<WineFilters>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ bottles: 0, distinctWines: 0, regions: [] as string[], types: [] as any[] });
  const [settings, setSettings] = useState<AppSettings>({ zipCode: '94102', seeded: false });
  const [tastingsByWine, setTastingsByWine] = useState<Record<string, TastingNote[]>>({});

  const refresh = useCallback(async (nextFilters?: WineFilters) => {
    setLoading(true);
    try {
      await ensureSeeded();
      const f = nextFilters ?? filters;
      const [list, s, sett, allTastings] = await Promise.all([
        filterWines(f),
        getCatalogStats(),
        getSettings(),
        getAllTastings(),
      ]);
      setWines(list);
      setStats(s);
      setSettings(sett);
      const map: Record<string, TastingNote[]> = {};
      for (const t of allTastings) {
        (map[t.wineId] ??= []).push(t);
      }
      setTastingsByWine(map);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    refresh();
  }, []);

  const applyFilters = useCallback(
    async (patch: Partial<WineFilters>) => {
      const next = { ...filters, ...patch };
      setFilters(next);
      await refresh(next);
    },
    [filters, refresh]
  );

  const saveWine = useCallback(
    async (input: Parameters<typeof upsertWine>[0]) => {
      const wine = await upsertWine(input);
      await refresh();
      return wine;
    },
    [refresh]
  );

  const changeQty = useCallback(
    async (id: string, delta: number) => {
      await adjustQuantity(id, delta);
      await refresh();
    },
    [refresh]
  );

  const removeWine = useCallback(
    async (id: string) => {
      await deleteWine(id);
      await refresh();
    },
    [refresh]
  );

  const logTasting = useCallback(
    async (input: Parameters<typeof addTasting>[0]) => {
      const note = await addTasting(input);
      await refresh();
      return note;
    },
    [refresh]
  );

  const removeTasting = useCallback(
    async (id: string) => {
      await deleteTasting(id);
      await refresh();
    },
    [refresh]
  );

  const saveSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const next = await updateSettings(patch);
    setSettings(next);
    return next;
  }, []);

  const resetData = useCallback(async () => {
    await resetSampleData();
    setFilters(emptyFilters);
    await refresh(emptyFilters);
  }, [refresh]);

  return {
    wines,
    filters,
    loading,
    stats,
    settings,
    tastingsByWine,
    refresh,
    applyFilters,
    saveWine,
    changeQty,
    removeWine,
    logTasting,
    removeTasting,
    saveSettings,
    resetData,
    getWineById,
    getTastingsForWine,
    getRelatedVintages,
  };
}
