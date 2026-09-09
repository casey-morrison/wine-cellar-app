import { Pressable, StyleSheet, Text, View } from 'react-native';
import Colors from '@/constants/Colors';

const c = Colors.dark;

interface Props {
  value: number;
  onChange: (v: number) => void;
}

/** 0–10 in half-point increments */
export function ScorePicker({ value, onChange }: Props) {
  const options: number[] = [];
  for (let i = 0; i <= 20; i++) options.push(i / 2);

  return (
    <View>
      <Text style={styles.current}>{value.toFixed(1)} / 10</Text>
      <View style={styles.grid}>
        {options.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[styles.cell, value === opt && styles.cellSelected]}
          >
            <Text style={[styles.cellText, value === opt && styles.cellTextSelected]}>
              {opt % 1 === 0 ? opt.toFixed(0) : opt.toFixed(1)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  current: {
    color: c.scoreGold,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  cell: {
    width: 52,
    height: 44,
    borderRadius: 10,
    backgroundColor: c.backgroundCard,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: { backgroundColor: c.tint, borderColor: c.tintLight },
  cellText: { color: c.textSecondary, fontWeight: '600' },
  cellTextSelected: { color: '#fff' },
});
