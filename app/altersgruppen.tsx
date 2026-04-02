import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';
import type { AgeGroup } from '@/lib/mentalLoadQuestions';

const ageGroups: AgeGroup[] = ['0-1', '1-3', '3-6', '6-12', '12-18'];

export default function AltersgruppenScreen() {
  const { setAgeGroups } = useMentalLoadFlow();
  const [selected, setSelected] = useState<AgeGroup[]>([]);

  const toggle = (group: AgeGroup) => {
    setSelected((prev) => (prev.includes(group) ? prev.filter((item) => item !== group) : [...prev, group]));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wie alt sind deine Kinder</Text>
      <Text style={styles.text}>Wir passen die Fragen an das Alter deiner Kinder an.</Text>
      {ageGroups.map((group) => {
        const active = selected.includes(group);
        return (
          <Pressable key={group} style={[styles.option, active && styles.optionActive]} onPress={() => toggle(group)}>
            <Text style={[styles.optionText, active && styles.optionTextActive]}>{group}</Text>
          </Pressable>
        );
      })}
      <Pressable
        style={styles.cta}
        onPress={() => {
          setAgeGroups(selected.length ? selected : ['3-6']);
          router.push('/quiz-intro' as never);
        }}
      >
        <Text style={styles.ctaText}>Weiter</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 10 },
  title: { fontSize: 28, fontWeight: '700' },
  text: { color: '#334155', marginBottom: 6 },
  option: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12 },
  optionActive: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
  optionText: { fontSize: 16 },
  optionTextActive: { color: '#1d4ed8', fontWeight: '700' },
  cta: { marginTop: 8, backgroundColor: '#2563eb', borderRadius: 10, padding: 14 },
  ctaText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
