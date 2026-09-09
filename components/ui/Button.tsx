import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Colors from '@/constants/Colors';

const c = Colors.dark;

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props extends PressableProps {
  title: string;
  variant?: Variant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, variant = 'primary', loading, disabled, style, ...rest }: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : c.tintLight} />
      ) : (
        <Text style={[styles.label, styles[`label_${variant}` as const]]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: c.tint },
  secondary: { backgroundColor: c.backgroundCard, borderWidth: 1, borderColor: c.border },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: c.danger },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.45 },
  label: { fontSize: 16, fontWeight: '600' },
  label_primary: { color: '#FFF' },
  label_secondary: { color: c.text },
  label_ghost: { color: c.tintLight },
  label_danger: { color: '#FFF' },
});
