import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';

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
      <Pressable onPress={() => router.push('/aufgaben-katalog' as never)}>
        <Text style={styles.link}>Zum Aufgabenkatalog</Text>
      </Pressable>

      {session.tasks.map((task) => (
        <View key={task.id} style={styles.taskCard}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.text}>Kategorie: {task.category}</Text>
            </View>
            <Pressable onPress={() => setSelectedTaskId(task.id)}>
              <Text style={styles.editIcon}>✏️</Text>
            </Pressable>
          </View>

          <View style={styles.row}>
            <Pressable onPress={() => setTaskOwner(task.id, 'initiator')}>
              <Text style={[styles.nameChip, task.owner === 'initiator' && styles.nameChipActive]}>{initiatorName}</Text>
            </Pressable>
            <Pressable onPress={() => setTaskOwner(task.id, 'partner')}>
              <Text style={[styles.nameChip, task.owner === 'partner' && styles.nameChipActive]}>{partnerName}</Text>
            </Pressable>
          </View>
        </View>
      ))}

      {selectedTask && (
        <View style={styles.editorCard}>
          <Text style={styles.cardTitle}>Aufgabe bearbeiten</Text>
          <TextInput
            style={styles.input}
            value={selectedTask.title}
            onChangeText={(value) => updateTask(selectedTask.id, { title: value })}
            placeholder="Titel"
          />
          <Text style={styles.text}>Kategorie: {selectedTask.category}</Text>
          <TextInput
            style={styles.notes}
            multiline
            textAlignVertical="top"
            value={selectedTask.details}
            onChangeText={(value) => updateTask(selectedTask.id, { details: value })}
            placeholder="Details / Notizen"
          />
          <Text style={styles.text}>Zugeordnet: {selectedTask.owner === 'initiator' ? initiatorName : selectedTask.owner === 'partner' ? partnerName : 'nicht zugewiesen'}</Text>
          <View style={styles.row}>
            <Pressable onPress={() => setTaskOwner(selectedTask.id, 'initiator')}>
              <Text style={[styles.nameChip, selectedTask.owner === 'initiator' && styles.nameChipActive]}>{initiatorName}</Text>
            </Pressable>
            <Pressable onPress={() => setTaskOwner(selectedTask.id, 'partner')}>
              <Text style={[styles.nameChip, selectedTask.owner === 'partner' && styles.nameChipActive]}>{partnerName}</Text>
            </Pressable>
          </View>
          <Pressable style={styles.deleteButton} onPress={() => { removeTask(selectedTask.id); setSelectedTaskId(null); }}>
            <Text style={styles.deleteText}>Aufgabe aus Liste löschen</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={styles.secondary} onPress={() => { addTask('Neue Aufgabe', null, 'Allgemein'); }}>
        <Text style={styles.secondaryText}>Neue Aufgabe hinzufügen</Text>
      </Pressable>

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
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  taskTitle: { fontWeight: '700' },
  editIcon: { fontSize: 18 },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  nameChip: { color: '#1d4ed8', fontWeight: '600' },
  nameChipActive: { color: '#2563eb', textDecorationLine: 'underline' },
  editorCard: { borderWidth: 1, borderColor: '#93c5fd', borderRadius: 10, padding: 12, gap: 8, backgroundColor: '#eff6ff' },
  cardTitle: { fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, backgroundColor: '#fff' },
  notes: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, minHeight: 110, backgroundColor: '#fff' },
  secondary: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10 },
  secondaryText: { textAlign: 'center', fontWeight: '600' },
  deleteButton: { backgroundColor: '#ef4444', borderRadius: 8, padding: 10 },
  deleteText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  button: { marginTop: 'auto', backgroundColor: '#2563eb', borderRadius: 10, padding: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
