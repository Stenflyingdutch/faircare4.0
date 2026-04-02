import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';

export default function AufgabenScreen() {
  const { session, setTaskOwner } = useMentalLoadFlow();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wer übernimmt was</Text>
      <Text style={styles.text}>Jede Aufgabe hat eine klare verantwortliche Person.</Text>
      {session.tasks.map((task) => (
        <View key={task.id} style={styles.taskCard}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <Text style={styles.text}>Ownership: {task.owner ?? 'nicht zugewiesen'}</Text>
          <View style={styles.row}>
            <Pressable style={styles.chip} onPress={() => setTaskOwner(task.id, 'initiator')}><Text>Ich</Text></Pressable>
            <Pressable style={styles.chip} onPress={() => setTaskOwner(task.id, 'partner')}><Text>Partner</Text></Pressable>
          </View>
        </View>
      ))}
      <Pressable style={styles.button} onPress={() => router.push('/aufgaben-bestaetigung' as never)}>
        <Text style={styles.buttonText}>Speichern</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({ container: { flex: 1, padding: 24, gap: 8 }, title: { fontSize: 28, fontWeight: '700' }, text: { color: '#334155' }, taskCard: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, gap: 4 }, taskTitle: { fontWeight: '700' }, row: { flexDirection: 'row', gap: 8 }, chip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }, button: { marginTop: 'auto', backgroundColor: '#2563eb', borderRadius: 10, padding: 12 }, buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' } });
