import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useCellarContext } from '@/context/CellarContext';
import { WineCard } from '@/components/WineCard';
import { SearchBar } from '@/components/ui/SearchBar';
import { Chip } from '@/components/ui/Chip';
import type { WineType } from '@/types/wine';

const c = Colors.dark;
const TYPES: (WineType | 'All')[] = ['All', 'Red', 'White', 'Rosé', 'Sparkling', 'Dessert', 'Fortified'];

export default function CellarScreen() {
  const { wines, filters, applyFilters, loading, stats, tastingsByWine } = useCellarContext();
  const [showFilters, setShowFilters] = useState(false);

  const regions = useMemo(() => {
    const set = new Set(wines.map((w) => w.country));
    // Prefer full catalog countries from stats when available
    return (stats.regions.length ? stats.regions : [...set]).sort();
  }, [wines, stats.regions]);

  const vintages = useMemo(() => {
    const vs = [...new Set(wines.map((w) => w.vintage).filter((v): v is number => v != null))];
    return vs.sort((a, b) => b - a);
  }, [wines]);

  return (
    <View style={styles.screen}>
      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>Casey Morrison</Text>
        <Text style={styles.title}>Wine Cellar</Text>
        <View style={styles.statsRow}>
          <Stat label="Bottles" value={String(stats.bottles)} />
          <Stat label="Wines" value={String(stats.distinctWines)} />
          <Stat label="Countries" value={String(stats.regions.length)} />
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <SearchBar
            value={filters.query}
            onChangeText={(query) => applyFilters({ query })}
          />
        </View>
        <Pressable
          style={[styles.filterBtn, showFilters && styles.filterBtnOn]}
          onPress={() => setShowFilters((s) => !s)}
          accessibilityLabel="Toggle filters"
        >
          <Ionicons name="options-outline" size={22} color={c.text} />
        </Pressable>
        <Pressable
          style={styles.addBtn}
          onPress={() => router.push({ pathname: '/wine/edit', params: { mode: 'create' } })}
          accessibilityLabel="Add wine"
        >
          <Ionicons name="add" size={26} color="#fff" />
        </Pressable>
      </View>

      {showFilters && (
        <View style={styles.filters}>
          <Text style={styles.filterLabel}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {TYPES.map((t) => (
              <Chip
                key={t}
                label={t}
                selected={(filters.type ?? 'All') === t}
                onPress={() => applyFilters({ type: t === 'All' ? null : t })}
              />
            ))}
          </ScrollView>
          <Text style={styles.filterLabel}>Country</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Chip
              label="All"
              selected={!filters.region}
              onPress={() => applyFilters({ region: null })}
            />
            {regions.map((r) => (
              <Chip
                key={r}
                label={r}
                selected={filters.region === r}
                onPress={() => applyFilters({ region: r })}
              />
            ))}
          </ScrollView>
          <Text style={styles.filterLabel}>Min rating</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[null, 7, 8, 9].map((n) => (
              <Chip
                key={String(n)}
                label={n == null ? 'Any' : `${n}+`}
                selected={filters.minRating === n}
                onPress={() => applyFilters({ minRating: n })}
              />
            ))}
          </ScrollView>
          <Text style={styles.filterLabel}>Quantity</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Chip
              label="Any"
              selected={filters.minQty == null}
              onPress={() => applyFilters({ minQty: null })}
            />
            <Chip
              label="In stock"
              selected={filters.minQty === 1}
              onPress={() => applyFilters({ minQty: 1 })}
            />
            <Chip
              label="3+"
              selected={filters.minQty === 3}
              onPress={() => applyFilters({ minQty: 3 })}
            />
          </ScrollView>
          {vintages.length > 0 && (
            <>
              <Text style={styles.filterLabel}>Vintage</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Chip
                  label="All"
                  selected={filters.vintage == null}
                  onPress={() => applyFilters({ vintage: null })}
                />
                {vintages.slice(0, 12).map((v) => (
                  <Chip
                    key={v}
                    label={String(v)}
                    selected={filters.vintage === v}
                    onPress={() => applyFilters({ vintage: v })}
                  />
                ))}
              </ScrollView>
            </>
          )}
        </View>
      )}

      {loading && wines.length === 0 ? (
        <ActivityIndicator color={c.tintLight} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={wines}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <WineCard
              wine={item}
              tastings={tastingsByWine[item.id]}
              onPress={() => router.push(`/wine/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="wine-outline" size={48} color={c.textMuted} />
              <Text style={styles.emptyTitle}>No wines match</Text>
              <Text style={styles.emptyBody}>Try clearing filters or add a bottle manually.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  headerBlock: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  eyebrow: { color: c.tintLight, fontSize: 13, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: c.text, fontSize: 30, fontWeight: '800', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  stat: {
    flex: 1,
    backgroundColor: c.backgroundCard,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: c.border,
  },
  statValue: { color: c.text, fontSize: 20, fontWeight: '700' },
  statLabel: { color: c.textMuted, fontSize: 12, marginTop: 2 },
  searchRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8, alignItems: 'center' },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: c.backgroundCard,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnOn: { borderColor: c.tintLight, backgroundColor: c.tintMuted },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: c.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: { paddingHorizontal: 16, paddingBottom: 8 },
  filterLabel: { color: c.textMuted, fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 6, textTransform: 'uppercase' },
  list: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 4 },
  empty: { alignItems: 'center', marginTop: 60, gap: 8, paddingHorizontal: 24 },
  emptyTitle: { color: c.text, fontSize: 18, fontWeight: '700' },
  emptyBody: { color: c.textSecondary, textAlign: 'center' },
});
