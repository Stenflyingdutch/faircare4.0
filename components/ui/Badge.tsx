import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/lib/theme';

type BadgeTone = 'default' | 'accent' | 'conflict';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
};

const tones = {
  default: {
    backgroundColor: '#EEF2FA',
    color: theme.colors.textSecondary,
  },
  accent: {
    backgroundColor: '#EAF8EF',
    color: '#397A58',
  },
  conflict: {
    backgroundColor: '#FDEEEB',
    color: '#AA4A43',
  },
} as const;

export function Badge({ label, tone = 'default' }: BadgeProps) {
  const currentTone = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: currentTone.backgroundColor }]}>
      <Text style={[styles.text, { color: currentTone.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
