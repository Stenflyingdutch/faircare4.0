import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { theme } from '@/lib/theme';

type SoftButtonVariant = 'primary' | 'secondary' | 'neutral' | 'danger';

type SoftButtonProps = {
  label: string;
  onPress: () => void;
  variant?: SoftButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  iconRight?: ReactNode;
};

const variantStyles = {
  primary: {
    backgroundColor: theme.colors.primary,
    textColor: '#FFFFFF',
  },
  secondary: {
    backgroundColor: theme.colors.accent,
    textColor: '#FFFFFF',
  },
  neutral: {
    backgroundColor: '#EEF2FA',
    textColor: theme.colors.textPrimary,
  },
  danger: {
    backgroundColor: theme.colors.conflict,
    textColor: '#FFFFFF',
  },
} as const;

export function SoftButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
  iconRight,
}: SoftButtonProps) {
  const variantStyle = variantStyles[variant];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: variantStyle.backgroundColor },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={[styles.label, { color: variantStyle.textColor }]}>{label}</Text>
      {iconRight}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 1,
  },
  label: {
    fontSize: theme.typography.body,
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  disabled: {
    opacity: 0.55,
  },
});
