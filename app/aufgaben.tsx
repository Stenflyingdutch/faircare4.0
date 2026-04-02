import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';

const TASK_CATALOG = [
  'Arzttermine und Gesundheit koordinieren',
  'Termine mit Kita oder Schule im Blick halten',
  'Alltagsvorbereitung für die Woche planen',
  'Essensplan erstellen',
  'Wocheneinkauf vorbereiten',
];

export default function AufgabenScreen() {
  const { session, setTaskOwner, addTask, updateTask, removeTask } = useMentalLoadFlow();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const initiatorName = session.initiatorUser?.displayName || 'Initiator';
  const partnerName = session.partnerUser?.displayName || 'Partner';

  const selectedTask = useMemo(
    () => session.tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, session.tasks],
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Wer übernimmt was</Text>
      <Text style={styles.text}>Jede Aufgabe hat eine klare verantwortliche Person.</Text>
      <Pressable onPress={() => setSelectedTaskId('catalog')}>
        <Text style={styles.link}>Zum Aufgabenkatalog</Text>
      </Pressable>

      {session.tasks.map((task) => (
        <Pressable key={task.id} style={styles.taskCard} onPress={() => setSelectedTaskId(task.id)}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <Text style={styles.text}>Ownership: {task.owner === 'initiator' ? initiatorName : task.owner === 'partner' ? partnerName : 'nicht zugewiesen'}</Text>
          <View style={styles.row}>
            <Pressable style={styles.chip} onPress={() => setTaskOwner(task.id, 'initiator')}><Text>{initiatorName}</Text></Pressable>
            <Pressable style={styles.chip} onPress={() => setTaskOwner(task.id, 'partner')}><Text>{partnerName}</Text></Pressable>
          </View>
        </Pressable>
      ))}

      {selectedTask && selectedTaskId !== 'catalog' && (
        <View style={styles.editorCard}>
          <Text style={styles.cardTitle}>Aufgabe bearbeiten</Text>
          <TextInput
            style={styles.input}
            value={selectedTask.title}
            onChangeText={(value) => updateTask(selectedTask.id, { title: value })}
            placeholder="Titel"
          />
          <TextInput
            style={styles.input}
            value={selectedTask.details}
            onChangeText={(value) => updateTask(selectedTask.id, { details: value })}
            placeholder="Details"
          />
          <TextInput
            style={styles.input}
            value={selectedTask.goal ?? ''}
            onChangeText={(value) => updateTask(selectedTask.id, { goal: value })}
            placeholder="Zugeordnetes Ziel"
          />
          <View style={styles.row}>
            <Pressable style={styles.secondary} onPress={() => updateTask(selectedTask.id, { status: 'aktiv' })}><Text>Aktiv</Text></Pressable>
            <Pressable style={styles.secondary} onPress={() => updateTask(selectedTask.id, { status: 'pausiert' })}><Text>Pausiert</Text></Pressable>
            <Pressable style={styles.secondary} onPress={() => updateTask(selectedTask.id, { status: 'offen' })}><Text>Offen</Text></Pressable>
          </View>
          <Pressable style={styles.deleteButton} onPress={() => { removeTask(selectedTask.id); setSelectedTaskId(null); }}>
            <Text style={styles.deleteText}>Aufgabe löschen</Text>
          </Pressable>
        </View>
      )}

      {(selectedTaskId === 'catalog' || !selectedTaskId) && (
        <View style={styles.editorCard}>
          <Text style={styles.cardTitle}>Aufgabenkatalog</Text>
          {TASK_CATALOG.map((item) => (
            <View key={item} style={styles.catalogRow}>
              <Text style={styles.text}>{item}</Text>
              <Pressable style={styles.secondary} onPress={() => addTask(item)}><Text>Übernehmen</Text></Pressable>
            </View>
          ))}
        </View>
      )}

      <Pressable style={styles.button} onPress={() => router.push('/aufgaben-bestaetigung' as never)}>
        <Text style={styles.buttonText}>Speichern</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 10 },
  title: { fontSize: 28, fontWeight: '700' },
  text: { color: '#334155' },
  link: { color: '#1d4ed8', fontWeight: '700' },
  taskCard: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, gap: 6 },
  taskTitle: { fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  editorCard: { borderWidth: 1, borderColor: '#93c5fd', borderRadius: 10, padding: 12, gap: 8, backgroundColor: '#eff6ff' },
  cardTitle: { fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, backgroundColor: '#fff' },
  secondary: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8 },
  catalogRow: { borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 8, padding: 8, gap: 8 },
  deleteButton: { backgroundColor: '#ef4444', borderRadius: 8, padding: 10 },
  deleteText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  button: { marginTop: 'auto', backgroundColor: '#2563eb', borderRadius: 10, padding: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
