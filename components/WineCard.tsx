import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import type { TastingNote, Wine } from '@/types/wine';
import { averageScore } from '@/services/database';

const c = Colors.dark;

interface Props {
  wine: Wine;
  tastings?: TastingNote[];
  onPress: () => void;
}

export function WineCard({ wine, tastings = [], onPress }: Props) {
  const avg = averageScore(tastings);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.thumb}>
        {wine.imageUri ? (
          <Image source={{ uri: wine.imageUri }} style={styles.image} contentFit="cover" />
        ) : (
          <Ionicons name="wine" size={28} color={c.tintLight} />
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.producer} numberOfLines={1}>
          {wine.producer}
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {wine.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {wine.vintage ?? 'NV'} · {wine.region} · {wine.type}
        </Text>
        <View style={styles.row}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {wine.quantity} btls
            </Text>
          </View>
          {avg != null && (
            <View style={[styles.badge, styles.scoreBadge]}>
              <Ionicons name="star" size={12} color={c.scoreGold} />
              <Text style={styles.badgeText}>{avg}/10</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: c.backgroundCard,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: 10,
    minHeight: 96,
  },
  pressed: { opacity: 0.9 },
  thumb: {
    width: 64,
    height: 80,
    borderRadius: 10,
    backgroundColor: c.tintMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  body: { flex: 1, gap: 2 },
  producer: { color: c.tintLight, fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  name: { color: c.text, fontSize: 16, fontWeight: '600' },
  meta: { color: c.textSecondary, fontSize: 13, marginTop: 2 },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  badge: {
    backgroundColor: c.backgroundElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreBadge: { backgroundColor: '#2A2210' },
  badgeText: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },
});
