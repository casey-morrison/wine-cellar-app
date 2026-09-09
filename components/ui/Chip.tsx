import { Pressable, StyleSheet, Text } from 'react-native';
import Colors from '@/constants/Colors';

const c = Colors.dark;

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: c.backgroundCard,
    borderWidth: 1,
    borderColor: c.border,
    marginRight: 8,
    marginBottom: 8,
  },
  selected: {
    backgroundColor: c.tintMuted,
    borderColor: c.tintLight,
  },
  text: { color: c.textSecondary, fontSize: 14, fontWeight: '500' },
  textSelected: { color: c.text },
});
