import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '@/lib/theme';

type PremiumCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function PremiumCard({ children, style }: PremiumCardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F2',
  },
});
