import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';

const CATEGORIES = ['Alltag', 'Organisation', 'Gesundheit', 'Schule', 'Freizeit', 'Sonstiges'];
const BOTTOM_TABS = [
  { label: 'Start', tab: 'startseite' },
  { label: 'Ziele', tab: 'ziele' },
  { label: 'Aufgaben', tab: 'aufgaben' },
  { label: 'Review', tab: 'review' },
] as const;

export default function AufgabenScreen() {
  const { session, setTaskOwner, addTask, updateTask, removeTask } = useMentalLoadFlow();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCategoryMenuFor, setShowCategoryMenuFor] = useState<string | null>(null);
  const [pendingNewTask, setPendingNewTask] = useState(false);

  const initiatorName = session.initiatorUser?.displayName || 'Initiator';
  const partnerName = session.partnerUser?.displayName || 'Partner';

  const selectedTask = useMemo(
    () => session.tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, session.tasks],
  );

  useEffect(() => {
    if (!pendingNewTask) {
      return;
    }
    const newest = session.tasks[session.tasks.length - 1];
    if (newest) {
      setSelectedTaskId(newest.id);
    }
    setPendingNewTask(false);
  }, [pendingNewTask, session.tasks]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Wer übernimmt was</Text>
      <Text style={styles.text}>Jede Aufgabe hat eine klare verantwortliche Person.</Text>

      <View style={styles.topRow}>
        <Pressable onPress={() => router.push('/aufgaben-katalog' as never)}>
          <Text style={styles.link}>Zum Aufgabenkatalog</Text>
        </Pressable>
        <Pressable
          style={styles.addButton}
          onPress={() => {
            addTask('Neue Aufgabe', null, 'Alltag');
            setPendingNewTask(true);
          }}
        >
          <Text style={styles.addButtonText}>Neue Aufgabe hinzufügen</Text>
        </Pressable>
      </View>

      {session.tasks.map((task) => {
        const isEditing = selectedTaskId === task.id;

        if (isEditing) {
          return (
            <View key={task.id} style={styles.editorCard}>
              <Text style={styles.cardTitle}>Aufgabe bearbeiten</Text>
              <TextInput
                style={styles.input}
                value={task.title}
                onChangeText={(value) => updateTask(task.id, { title: value })}
                placeholder="Titel"
              />

              <Text style={styles.fieldLabel}>Kategorie</Text>
              <Pressable style={styles.dropdownButton} onPress={() => setShowCategoryMenuFor(showCategoryMenuFor === task.id ? null : task.id)}>
                <Text style={styles.dropdownText}>{task.category}</Text>
                <Text style={styles.dropdownCaret}>▾</Text>
              </Pressable>
              {showCategoryMenuFor === task.id && (
                <View style={styles.dropdownMenu}>
                  {CATEGORIES.map((category) => (
                    <Pressable
                      key={category}
                      style={[styles.dropdownOption, task.category === category && styles.dropdownOptionActive]}
                      onPress={() => {
                        updateTask(task.id, { category });
                        setShowCategoryMenuFor(null);
                      }}
                    >
                      <Text>{category}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <TextInput
                style={styles.notes}
                multiline
                textAlignVertical="top"
                value={task.details}
                onChangeText={(value) => updateTask(task.id, { details: value })}
                placeholder="Details / Notizen"
              />

              <View style={styles.row}>
                <Pressable style={[styles.ownerButton, task.owner === 'initiator' && styles.ownerButtonActive]} onPress={() => setTaskOwner(task.id, 'initiator')}>
                  <Text style={[styles.ownerButtonText, task.owner === 'initiator' && styles.ownerButtonTextActive]}>{initiatorName}</Text>
                </Pressable>
                <Pressable style={[styles.ownerButton, task.owner === 'partner' && styles.ownerButtonActive]} onPress={() => setTaskOwner(task.id, 'partner')}>
                  <Text style={[styles.ownerButtonText, task.owner === 'partner' && styles.ownerButtonTextActive]}>{partnerName}</Text>
                </Pressable>
              </View>

              <View style={styles.row}>
                <Pressable style={styles.secondary} onPress={() => setSelectedTaskId(null)}>
                  <Text style={styles.secondaryText}>Fertig</Text>
                </Pressable>
                <Pressable style={styles.deleteButton} onPress={() => { removeTask(task.id); setSelectedTaskId(null); }}>
                  <Text style={styles.deleteText}>Aufgabe löschen</Text>
                </Pressable>
              </View>
            </View>
          );
        }

        return (
          <View key={task.id} style={styles.taskCard}>
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.text}>Kategorie: {task.category}</Text>
              </View>
              <Pressable style={styles.editButton} onPress={() => setSelectedTaskId(task.id)}>
                <Text style={styles.editButtonText}>Bearbeiten</Text>
              </Pressable>
            </View>

            <View style={styles.row}>
              <Pressable style={[styles.ownerButton, task.owner === 'initiator' && styles.ownerButtonActive]} onPress={() => setTaskOwner(task.id, 'initiator')}>
                <Text style={[styles.ownerButtonText, task.owner === 'initiator' && styles.ownerButtonTextActive]}>{initiatorName}</Text>
              </Pressable>
              <Pressable style={[styles.ownerButton, task.owner === 'partner' && styles.ownerButtonActive]} onPress={() => setTaskOwner(task.id, 'partner')}>
                <Text style={[styles.ownerButtonText, task.owner === 'partner' && styles.ownerButtonTextActive]}>{partnerName}</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <Pressable style={styles.button} onPress={() => router.push('/aufgaben-bestaetigung' as never)}>
        <Text style={styles.buttonText}>Speichern</Text>
      </Pressable>
      </ScrollView>

      <View style={styles.tabBar}>
        {BOTTOM_TABS.map((item) => (
          <Pressable key={item.tab} style={styles.tabBarItem} onPress={() => router.push({ pathname: '/startseite', params: { tab: item.tab } } as never)}>
            <Text style={[styles.tabBarText, item.tab === 'aufgaben' && styles.tabBarTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flexGrow: 1, padding: 24, gap: 10 },
  title: { fontSize: 28, fontWeight: '700' },
  text: { color: '#334155' },
  link: { color: '#1d4ed8', fontWeight: '700' },
  topRow: { gap: 8 },
  addButton: { backgroundColor: '#2563eb', borderRadius: 10, padding: 10 },
  addButtonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  taskCard: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  taskTitle: { fontWeight: '700', fontSize: 15 },
  editButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  editButtonText: { fontWeight: '600', color: '#1e293b' },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  ownerButton: { borderRadius: 999, borderWidth: 1, borderColor: '#bfdbfe', backgroundColor: '#eff6ff', paddingHorizontal: 18, paddingVertical: 10, minWidth: 82, alignItems: 'center' },
  ownerButtonActive: { borderColor: '#2563eb', backgroundColor: '#dbeafe' },
  ownerButtonText: { color: '#1d4ed8', fontWeight: '700', fontSize: 20 },
  ownerButtonTextActive: { color: '#1e3a8a' },
  editorCard: { borderWidth: 1, borderColor: '#93c5fd', borderRadius: 10, padding: 12, gap: 8, backgroundColor: '#eff6ff' },
  cardTitle: { fontWeight: '700' },
  fieldLabel: { color: '#334155', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, backgroundColor: '#fff' },
  notes: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, minHeight: 110, backgroundColor: '#fff' },
  dropdownButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between' },
  dropdownText: { color: '#0f172a' },
  dropdownCaret: { color: '#64748b' },
  dropdownMenu: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#fff', overflow: 'hidden' },
  dropdownOption: { paddingHorizontal: 10, paddingVertical: 9 },
  dropdownOptionActive: { backgroundColor: '#dbeafe' },
  secondary: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, flex: 1 },
  secondaryText: { textAlign: 'center', fontWeight: '600' },
  deleteButton: { backgroundColor: '#ef4444', borderRadius: 10, padding: 10, flex: 1 },
  deleteText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  button: { marginTop: 'auto', backgroundColor: '#2563eb', borderRadius: 10, padding: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  tabBarItem: { flex: 1, paddingVertical: 12 },
  tabBarText: { textAlign: 'center', color: '#475569', fontWeight: '600' },
  tabBarTextActive: { color: '#1d4ed8' },
});
