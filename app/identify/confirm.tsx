import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import Colors from '@/constants/Colors';
import { Button } from '@/components/ui/Button';
import { useCellarContext } from '@/context/CellarContext';
import { wineMetadataService } from '@/services/WineMetadataService';
import { averageScore } from '@/services/database';
import type { CriticScore, IdentifiedBottle, PriceQuote, TastingNote, Wine } from '@/types/wine';

const c = Colors.dark;

export default function IdentifyConfirmScreen() {
  const { payload, imageUri } = useLocalSearchParams<{ payload: string; imageUri: string }>();
  const { wines, tastingsByWine, saveWine, changeQty, settings, getRelatedVintages } =
    useCellarContext();

  const identified = useMemo(() => {
    try {
      return JSON.parse(payload ?? '{}') as IdentifiedBottle;
    } catch {
      return null;
    }
  }, [payload]);

  const matched: Wine | null = useMemo(() => {
    if (!identified) return null;
    if (identified.matchedWineId) {
      return wines.find((w) => w.id === identified.matchedWineId) ?? null;
    }
    return (
      wines.find(
        (w) =>
          w.producer.toLowerCase() === identified.producer.toLowerCase() &&
          w.name.toLowerCase() === identified.name.toLowerCase() &&
          w.vintage === identified.vintage
      ) ?? null
    );
  }, [identified, wines]);

  const [others, setOthers] = useState<Wine[]>([]);
  const [critics, setCritics] = useState<CriticScore[]>([]);
  const [price, setPrice] = useState<PriceQuote | null>(null);
  const [saving, setSaving] = useState(false);

  const tastings: TastingNote[] = matched ? tastingsByWine[matched.id] ?? [] : [];
  const avg = averageScore(tastings);

  useEffect(() => {
    if (!identified) return;
    const base = matched ?? {
      producer: identified.producer,
      name: identified.name,
      vintage: identified.vintage,
      type: identified.type,
      region: identified.region,
      country: identified.country,
      grape: identified.grape,
      id: '',
      quantity: 0,
      imageUri: null,
      notes: null,
      createdAt: '',
      updatedAt: '',
    };
    (async () => {
      if (matched) {
        setOthers(await getRelatedVintages(matched));
      } else {
        setOthers([]);
      }
      const [scores, quote] = await Promise.all([
        wineMetadataService.getCriticScores(base),
        wineMetadataService.getAverageRetailPrice(base, settings.zipCode),
      ]);
      setCritics(scores);
      setPrice(quote);
    })();
  }, [identified, matched, settings.zipCode, getRelatedVintages]);

  if (!identified) {
    return (
      <View style={styles.center}>
        <Text style={{ color: c.text }}>No identification result</Text>
      </View>
    );
  }

  const sameQty = matched?.quantity ?? 0;
  const otherQty = others.reduce((s, w) => s + w.quantity, 0);

  async function confirmAdd(delta: number) {
    setSaving(true);
    try {
      if (matched) {
        await changeQty(matched.id, delta);
        if (imageUri && !matched.imageUri) {
          await saveWine({ ...matched, imageUri });
        }
        Alert.alert('Updated', `Inventory ${delta > 0 ? 'increased' : 'adjusted'}.`, [
          { text: 'View wine', onPress: () => router.replace(`/wine/${matched.id}`) },
          { text: 'Done', onPress: () => router.back() },
        ]);
      } else {
        const wine = await saveWine({
          producer: identified!.producer,
          name: identified!.name,
          vintage: identified!.vintage,
          region: identified!.region,
          country: identified!.country,
          grape: identified!.grape,
          type: identified!.type,
          quantity: Math.max(1, delta),
          imageUri: imageUri ?? null,
          notes: null,
        });
        Alert.alert('Added to cellar', 'New wine created from label identification.', [
          { text: 'View wine', onPress: () => router.replace(`/wine/${wine.id}`) },
        ]);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Confirm bottle' }} />
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {!!imageUri && <Image source={{ uri: imageUri }} style={styles.thumb} />}
        <Text style={styles.confidence}>
          Match · {Math.round(identified.confidence * 100)}% confidence
        </Text>
        <Text style={styles.producer}>{identified.producer}</Text>
        <Text style={styles.name}>{identified.name}</Text>
        <Text style={styles.meta}>
          {identified.vintage ?? 'NV'} · {identified.region} · {identified.type}
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>In your cellar</Text>
          <Text style={styles.cardBody}>
            {sameQty} bottle{sameQty === 1 ? '' : 's'} of this vintage
            {others.length > 0
              ? ` · ${otherQty} across ${others.length} other vintage${others.length === 1 ? '' : 's'}`
              : ''}
          </Text>
          {!matched && (
            <Text style={[styles.cardBody, { marginTop: 6, color: c.warning }]}>
              Not currently in cellar — confirm to add.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your tasting</Text>
          {avg != null ? (
            <>
              <Text style={styles.score}>{avg} / 10</Text>
              {tastings[0]?.notes ? (
                <Text style={styles.cardBody} numberOfLines={3}>
                  {tastings[0].notes}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.cardBody}>Not tasted yet</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Critic scores (demo)</Text>
          {critics.map((cs) => (
            <Text key={cs.source} style={styles.cardBody}>
              {cs.source}: {cs.score}/{cs.maxScore}
            </Text>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Avg retail (demo · ZIP {settings.zipCode})</Text>
          <Text style={styles.score}>
            {price?.averagePrice != null ? `$${price.averagePrice}` : '—'}
          </Text>
        </View>

        <Button
          title={matched ? 'Add 1 to inventory' : 'Add to cellar'}
          onPress={() => confirmAdd(1)}
          loading={saving}
          style={{ marginTop: 8 }}
        />
        {matched && (
          <Button
            title="View wine details"
            variant="secondary"
            onPress={() => router.replace(`/wine/${matched.id}`)}
            style={{ marginTop: 10 }}
          />
        )}
        <Button title="Cancel" variant="ghost" onPress={() => router.back()} style={{ marginTop: 8 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background },
  thumb: { width: '100%', height: 220, borderRadius: 16, marginBottom: 16 },
  confidence: { color: c.textMuted, fontSize: 13, marginBottom: 6 },
  producer: { color: c.tintLight, fontWeight: '700', fontSize: 14 },
  name: { color: c.text, fontSize: 24, fontWeight: '800', marginTop: 4 },
  meta: { color: c.textSecondary, marginTop: 6, marginBottom: 16 },
  card: {
    backgroundColor: c.backgroundCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: 10,
  },
  cardTitle: { color: c.text, fontWeight: '700', marginBottom: 6 },
  cardBody: { color: c.textSecondary, lineHeight: 20 },
  score: { color: c.scoreGold, fontSize: 28, fontWeight: '800', marginBottom: 4 },
});
