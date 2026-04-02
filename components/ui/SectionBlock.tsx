import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/lib/theme';

type SectionBlockProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function SectionBlock({ title, subtitle, children }: SectionBlockProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.subtitle,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: theme.typography.caption,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  content: {
    gap: theme.spacing.sm,
  },
});
