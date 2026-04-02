import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';

const options = [1, 2, 3, 4];

export default function KinderanzahlScreen() {
  const { setChildrenCount } = useMentalLoadFlow();
  const [selected, setSelected] = useState<number>(1);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wie viele Kinder hast du</Text>
      {options.map((option) => {
        const value = option === 4 ? '4+' : String(option);
        const isActive = selected === option;
        return (
          <Pressable key={option} style={[styles.option, isActive && styles.optionActive]} onPress={() => setSelected(option)}>
            <Text style={[styles.optionText, isActive && styles.optionTextActive]}>{value}</Text>
          </Pressable>
        );
      })}
      <Pressable
        style={styles.cta}
        onPress={() => {
          setChildrenCount(selected);
          router.push('/altersgruppen' as never);
        }}
      >
        <Text style={styles.ctaText}>Weiter</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  option: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 14 },
  optionActive: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
  optionText: { fontSize: 18 },
  optionTextActive: { color: '#1d4ed8', fontWeight: '700' },
  cta: { backgroundColor: '#2563eb', borderRadius: 10, padding: 14, marginTop: 8 },
  ctaText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
