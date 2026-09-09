import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { Button } from '@/components/ui/Button';
import { useCellarContext } from '@/context/CellarContext';
import { wineMetadataService } from '@/services/WineMetadataService';
import { averageScore } from '@/services/database';
import type { CriticScore, PriceQuote, TastingNote, Wine } from '@/types/wine';

const c = Colors.dark;

export default function WineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getWineById,
    getTastingsForWine,
    getRelatedVintages,
    changeQty,
    removeWine,
    settings,
    refresh,
  } = useCellarContext();

  const [wine, setWine] = useState<Wine | null>(null);
  const [tastings, setTastings] = useState<TastingNote[]>([]);
  const [others, setOthers] = useState<Wine[]>([]);
  const [critics, setCritics] = useState<CriticScore[]>([]);
  const [price, setPrice] = useState<PriceQuote | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const w = await getWineById(id);
      if (!w) {
        setWine(null);
        return;
      }
      setWine(w);
      const [t, rel] = await Promise.all([getTastingsForWine(id), getRelatedVintages(w)]);
      setTastings(t);
      setOthers(rel);
      const [scores, quote] = await Promise.all([
        wineMetadataService.getCriticScores(w),
        wineMetadataService.getAverageRetailPrice(w, settings.zipCode),
      ]);
      setCritics(scores);
      setPrice(quote);
    } finally {
      setLoading(false);
    }
  }, [id, getWineById, getTastingsForWine, getRelatedVintages, settings.zipCode]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={c.tintLight} />
      </View>
    );
  }

  if (!wine) {
    return (
      <View style={styles.center}>
        <Text style={{ color: c.text }}>Wine not found</Text>
      </View>
    );
  }

  const avg = averageScore(tastings);
  const sameVintageQty = wine.quantity;
  const otherVintageQty = others.reduce((s, w) => s + w.quantity, 0);

  return (
    <>
      <Stack.Screen options={{ title: wine.producer }} />
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={styles.hero}>
          {wine.imageUri ? (
            <Image source={{ uri: wine.imageUri }} style={styles.heroImage} contentFit="cover" />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="wine" size={64} color={c.tintLight} />
            </View>
          )}
          <Text style={styles.producer}>{wine.producer}</Text>
          <Text style={styles.name}>{wine.name}</Text>
          <Text style={styles.meta}>
            {wine.vintage ?? 'NV'} · {wine.region} · {wine.grape}
          </Text>
          <View style={styles.typePill}>
            <Text style={styles.typeText}>{wine.type}</Text>
          </View>
        </View>

        <Section title="In your cellar">
          <View style={styles.qtyRow}>
            <View style={styles.qtyCard}>
              <Text style={styles.qtyValue}>{sameVintageQty}</Text>
              <Text style={styles.qtyLabel}>This vintage</Text>
            </View>
            <View style={styles.qtyCard}>
              <Text style={styles.qtyValue}>{otherVintageQty}</Text>
              <Text style={styles.qtyLabel}>Other vintages</Text>
            </View>
            <View style={styles.qtyCard}>
              <Text style={styles.qtyValue}>{sameVintageQty + otherVintageQty}</Text>
              <Text style={styles.qtyLabel}>Total bottles</Text>
            </View>
          </View>
          <View style={styles.adjustRow}>
            <Pressable
              style={styles.adjustBtn}
              onPress={async () => {
                await changeQty(wine.id, -1);
                await load();
              }}
            >
              <Ionicons name="remove" size={22} color={c.text} />
            </Pressable>
            <Text style={styles.adjustLabel}>Adjust inventory</Text>
            <Pressable
              style={styles.adjustBtn}
              onPress={async () => {
                await changeQty(wine.id, 1);
                await load();
              }}
            >
              <Ionicons name="add" size={22} color={c.text} />
            </Pressable>
          </View>
        </Section>

        {others.length > 0 && (
          <Section title="Other vintages">
            {others.map((o) => (
              <Pressable
                key={o.id}
                style={styles.vintageRow}
                onPress={() => router.push(`/wine/${o.id}`)}
              >
                <Text style={styles.vintageYear}>{o.vintage ?? 'NV'}</Text>
                <Text style={styles.vintageQty}>{o.quantity} btls</Text>
                <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
              </Pressable>
            ))}
          </Section>
        )}

        <Section title="Your tasting">
          {avg != null ? (
            <>
              <Text style={styles.scoreHero}>{avg} / 10</Text>
              <Text style={styles.scoreSub}>
                Average across {tastings.length} tasting{tastings.length === 1 ? '' : 's'}
              </Text>
              {tastings.map((t) => (
                <View key={t.id} style={styles.tastingCard}>
                  <View style={styles.tastingHeader}>
                    <Text style={styles.tastingScore}>{t.score.toFixed(1)}</Text>
                    <Text style={styles.tastingDate}>
                      {new Date(t.tastedAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                  {!!t.notes && <Text style={styles.tastingNotes}>{t.notes}</Text>}
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.empty}>Not tasted yet — log your first impression.</Text>
          )}
          <Button
            title="Log tasting"
            onPress={() => router.push(`/tasting/${wine.id}`)}
            style={{ marginTop: 12 }}
          />
        </Section>

        <Section title="Critic scores">
          <Text style={styles.demoTag}>Demo data · Wine Spectator / Parker / Vinous</Text>
          {critics.map((cs) => (
            <View key={cs.source} style={styles.criticRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.criticSource}>{cs.source}</Text>
                {!!cs.tastingNote && (
                  <Text style={styles.criticNote} numberOfLines={2}>
                    {cs.tastingNote}
                  </Text>
                )}
              </View>
              <Text style={styles.criticScore}>
                {cs.score}
                <Text style={styles.criticMax}>/{cs.maxScore}</Text>
              </Text>
            </View>
          ))}
        </Section>

        <Section title="Local retail">
          <Text style={styles.demoTag}>Demo estimate for ZIP {settings.zipCode}</Text>
          {price?.averagePrice != null ? (
            <>
              <Text style={styles.price}>${price.averagePrice}</Text>
              <Text style={styles.priceSub}>
                Avg across ~{price.sampleSize} demo listings · {price.currency}
              </Text>
              <Text style={styles.disclaimer}>{price.disclaimer}</Text>
            </>
          ) : (
            <Text style={styles.empty}>No price estimate available.</Text>
          )}
        </Section>

        {!!wine.notes && (
          <Section title="Cellar notes">
            <Text style={styles.tastingNotes}>{wine.notes}</Text>
          </Section>
        )}

        <View style={{ paddingHorizontal: 20, gap: 10, marginTop: 8 }}>
          <Button
            title="Edit wine"
            variant="secondary"
            onPress={() =>
              router.push({ pathname: '/wine/edit', params: { mode: 'edit', id: wine.id } })
            }
          />
          <Button
            title="Delete wine"
            variant="danger"
            onPress={() => {
              Alert.alert('Delete this wine?', 'Tasting notes for this bottle will also be removed.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    await removeWine(wine.id);
                    await refresh();
                    router.back();
                  },
                },
              ]);
            }}
          />
        </View>
      </ScrollView>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background },
  hero: { alignItems: 'center', padding: 24, paddingBottom: 8 },
  heroImage: { width: 140, height: 180, borderRadius: 16, marginBottom: 16 },
  heroPlaceholder: {
    width: 140,
    height: 180,
    borderRadius: 16,
    backgroundColor: c.tintMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  producer: { color: c.tintLight, fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  name: { color: c.text, fontSize: 26, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  meta: { color: c.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' },
  typePill: {
    marginTop: 12,
    backgroundColor: c.backgroundCard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
  },
  typeText: { color: c.textSecondary, fontWeight: '600', fontSize: 13 },
  section: { paddingHorizontal: 20, marginTop: 22 },
  sectionTitle: { color: c.text, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  qtyRow: { flexDirection: 'row', gap: 8 },
  qtyCard: {
    flex: 1,
    backgroundColor: c.backgroundCard,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
  },
  qtyValue: { color: c.text, fontSize: 22, fontWeight: '800' },
  qtyLabel: { color: c.textMuted, fontSize: 11, marginTop: 4, textAlign: 'center' },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 14,
  },
  adjustBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: c.backgroundCard,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustLabel: { color: c.textSecondary, fontWeight: '600' },
  vintageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.backgroundCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  vintageYear: { color: c.text, fontWeight: '700', fontSize: 16, flex: 1 },
  vintageQty: { color: c.textSecondary, marginRight: 8 },
  scoreHero: { color: c.scoreGold, fontSize: 36, fontWeight: '800' },
  scoreSub: { color: c.textSecondary, marginBottom: 12 },
  tastingCard: {
    backgroundColor: c.backgroundCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  tastingHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  tastingScore: { color: c.scoreGold, fontWeight: '800', fontSize: 16 },
  tastingDate: { color: c.textMuted, fontSize: 13 },
  tastingNotes: { color: c.textSecondary, lineHeight: 20 },
  empty: { color: c.textMuted },
  demoTag: { color: c.textMuted, fontSize: 12, marginBottom: 10 },
  criticRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: c.backgroundCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  criticSource: { color: c.text, fontWeight: '700' },
  criticNote: { color: c.textSecondary, fontSize: 13, marginTop: 2 },
  criticScore: { color: c.text, fontSize: 22, fontWeight: '800' },
  criticMax: { color: c.textMuted, fontSize: 14, fontWeight: '500' },
  price: { color: c.text, fontSize: 34, fontWeight: '800' },
  priceSub: { color: c.textSecondary, marginTop: 4 },
  disclaimer: { color: c.textMuted, fontSize: 12, marginTop: 8, lineHeight: 18 },
});
