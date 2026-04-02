import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMentalLoadFlow, type GoalOption } from '@/contexts/MentalLoadFlowContext';

const options: GoalOption[] = [
  'Weniger für alles mitdenken müssen',
  'Klare Verantwortlichkeiten im Alltag',
  'Weniger Rückfragen und Erinnerungen',
  'Routinen stabil und planbar',
  'Bessere Vorbereitung im Alltag',
];
const BOTTOM_TABS = [
  { label: 'Start', tab: 'startseite' },
  { label: 'Ziele', tab: 'ziele' },
  { label: 'Aufgaben', tab: 'aufgaben' },
  { label: 'Review', tab: 'review' },
] as const;

export default function ZieleAuswahlScreen() {
  const { session, setGoals, addGoal } = useMentalLoadFlow();
  const [selected, setSelected] = useState<GoalOption[]>(session.goals.filter((goal): goal is GoalOption => options.includes(goal as GoalOption)));
  const [customGoal, setCustomGoal] = useState('');

  const selectionCount = useMemo(() => selected.length + (customGoal.trim() ? 1 : 0), [customGoal, selected.length]);

  const toggle = (goal: GoalOption) => {
    setSelected((prev) => (prev.includes(goal) ? prev.filter((item) => item !== goal) : prev.length >= 3 ? prev : [...prev, goal]));
  };

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>Was soll sich ändern</Text>
        <Text style={styles.text}>Wählt bis zu drei Ziele.</Text>
        {options.map((goal) => (
          <Pressable key={goal} style={[styles.option, selected.includes(goal) && styles.optionActive]} onPress={() => toggle(goal)}>
            <Text>{goal}</Text>
          </Pressable>
        ))}

        <View style={styles.customCard}>
          <Text style={styles.customLabel}>Eigenes Ziel</Text>
          <TextInput
            style={styles.input}
            placeholder="Ziel selbst eingeben"
            value={customGoal}
            onChangeText={(value) => {
              if (value.trim() && selected.length >= 3) {
                return;
              }
              setCustomGoal(value);
            }}
          />
          <Text style={styles.helper}>Ausgewählt: {selectionCount} / 3</Text>
        </View>

        <Pressable
          style={styles.button}
          onPress={() => {
            setGoals(selected);
            const cleanCustomGoal = customGoal.trim();
            if (cleanCustomGoal) {
              addGoal(cleanCustomGoal);
            }
            router.push('/ziel-fokus' as never);
          }}
        >
          <Text style={styles.buttonText}>Weiter</Text>
        </Pressable>
      </View>

      <View style={styles.tabBar}>
        {BOTTOM_TABS.map((item) => (
          <Pressable key={item.tab} style={styles.tabBarItem} onPress={() => router.push({ pathname: '/startseite', params: { tab: item.tab } } as never)}>
            <Text style={[styles.tabBarText, item.tab === 'ziele' && styles.tabBarTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1, padding: 24, gap: 10 },
  title: { fontSize: 28, fontWeight: '700' },
  text: { color: '#334155' },
  option: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12 },
  optionActive: { backgroundColor: '#dbeafe' },
  customCard: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, gap: 6 },
  customLabel: { fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, backgroundColor: '#fff' },
  helper: { color: '#64748b' },
  button: { marginTop: 'auto', backgroundColor: '#2563eb', borderRadius: 10, padding: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  tabBarItem: { flex: 1, paddingVertical: 12 },
  tabBarText: { textAlign: 'center', color: '#475569', fontWeight: '600' },
  tabBarTextActive: { color: '#1d4ed8' },
});
