import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMentalLoadFlow, type GoalOption } from '@/contexts/MentalLoadFlowContext';

const options: GoalOption[] = [
  'Weniger für alles mitdenken müssen',
  'Klare Verantwortlichkeiten im Alltag',
  'Weniger Rückfragen und Erinnerungen',
  'Routinen stabil und planbar',
  'Bessere Vorbereitung im Alltag',
];

export default function ZieleAuswahlScreen() {
  const { setGoals } = useMentalLoadFlow();
  const [selected, setSelected] = useState<GoalOption[]>([]);

  const toggle = (goal: GoalOption) => {
    setSelected((prev) => (prev.includes(goal) ? prev.filter((item) => item !== goal) : prev.length >= 3 ? prev : [...prev, goal]));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Was soll sich ändern</Text>
      <Text style={styles.text}>Wählt bis zu drei Ziele.</Text>
      {options.map((goal) => (
        <Pressable key={goal} style={[styles.option, selected.includes(goal) && styles.optionActive]} onPress={() => toggle(goal)}>
          <Text>{goal}</Text>
        </Pressable>
      ))}
      <Pressable style={styles.button} onPress={() => { setGoals(selected); router.push('/ziel-fokus' as never); }}>
        <Text style={styles.buttonText}>Weiter</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({ container: { flex: 1, padding: 24, gap: 10 }, title: { fontSize: 28, fontWeight: '700' }, text: { color: '#334155' }, option: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12 }, optionActive: { backgroundColor: '#dbeafe' }, button: { marginTop: 'auto', backgroundColor: '#2563eb', borderRadius: 10, padding: 12 }, buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' } });
