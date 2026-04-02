import { Redirect } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';

const TASK_CATALOG = [
  'Arzt- und Vorsorgetermine planen',
  'Kita-/Schulkommunikation koordinieren',
  'Wocheneinkauf und Mahlzeiten planen',
  'Freizeit- und Familienkalender abstimmen',
  'Kleidung und Vorräte im Blick behalten',
];

export default function StartseiteScreen() {
  const { logout, user } = useAuth();
  const { session, addTask } = useMentalLoadFlow();
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks'>('overview');
  const [newTaskTitle, setNewTaskTitle] = useState('');

  if (!user) {
    return <Redirect href={'/' as never} />;
  }

  const isInitiator = session.initiatorUser?.email?.toLowerCase() === user.email?.toLowerCase();
  const ownOwner = isInitiator ? 'initiator' : 'partner';

  const ownTasks = useMemo(() => session.tasks.filter((task) => task.owner === ownOwner), [ownOwner, session.tasks]);
  const partnerTasks = useMemo(
    () => session.tasks.filter((task) => task.owner && task.owner !== ownOwner),
    [ownOwner, session.tasks],
  );

  const addNewTask = () => {
    const clean = newTaskTitle.trim();
    if (!clean) {
      return;
    }
    addTask(clean, ownOwner);
    setNewTaskTitle('');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Startseite</Text>
        <Pressable style={styles.logoutSmall} onPress={logout}><Text style={styles.logoutText}>Logout</Text></Pressable>
      </View>

      <View style={styles.tabRow}>
        <Pressable style={[styles.tab, activeTab === 'overview' && styles.tabActive]} onPress={() => setActiveTab('overview')}>
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>Übersicht</Text>
        </Pressable>
        <Pressable style={[styles.tab, activeTab === 'tasks' && styles.tabActive]} onPress={() => setActiveTab('tasks')}>
          <Text style={[styles.tabText, activeTab === 'tasks' && styles.tabTextActive]}>Aufgaben</Text>
        </Pressable>
      </View>

      {activeTab === 'overview' && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Eure Ziele</Text>
            {session.goals.length === 0 && <Text style={styles.text}>Noch keine Ziele hinterlegt.</Text>}
            {session.goals.map((goal) => (
              <Text key={goal} style={styles.listItem}>• {goal}</Text>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Deine Aufgaben</Text>
            {ownTasks.length === 0 && <Text style={styles.text}>Dir sind aktuell keine Aufgaben zugeordnet.</Text>}
            {ownTasks.map((task) => (
              <Text key={task.id} style={styles.listItem}>• {task.title}</Text>
            ))}
          </View>
        </>
      )}

      {activeTab === 'tasks' && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Alle Aufgaben</Text>
            {session.tasks.map((task) => (
              <View key={task.id} style={styles.taskRow}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskOwner}>
                  {task.owner === ownOwner ? 'Meine Aufgabe' : task.owner ? 'Partner' : 'Nicht zugeordnet'}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Neue Aufgabe anlegen</Text>
            <TextInput
              placeholder="Aufgabe eingeben"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              style={styles.input}
            />
            <Pressable style={styles.primary} onPress={addNewTask}>
              <Text style={styles.primaryText}>Eigene Aufgabe hinzufügen</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Aufgabenkatalog</Text>
            {TASK_CATALOG.map((task) => (
              <View key={task} style={styles.catalogRow}>
                <Text style={styles.text}>{task}</Text>
                <Pressable style={styles.secondary} onPress={() => addTask(task, ownOwner)}>
                  <Text style={styles.secondaryText}>Hinzufügen</Text>
                </Pressable>
              </View>
            ))}
          </View>

          {partnerTasks.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Partner-Aufgaben</Text>
              {partnerTasks.map((task) => (
                <Text key={task.id} style={styles.listItem}>• {task.title}</Text>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 30, fontWeight: '700' },
  card: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, gap: 8 },
  cardTitle: { fontWeight: '700', fontSize: 17 },
  text: { color: '#334155' },
  listItem: { color: '#0f172a' },
  tabRow: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10 },
  tabActive: { backgroundColor: '#dbeafe', borderColor: '#2563eb' },
  tabText: { textAlign: 'center', fontWeight: '600', color: '#334155' },
  tabTextActive: { color: '#1d4ed8' },
  taskRow: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, gap: 4 },
  taskTitle: { fontWeight: '600' },
  taskOwner: { color: '#475569', fontSize: 12 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, backgroundColor: '#fff' },
  catalogRow: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, gap: 8 },
  primary: { backgroundColor: '#2563eb', borderRadius: 10, padding: 12 },
  primaryText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  secondary: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8 },
  secondaryText: { textAlign: 'center', fontWeight: '600' },
  logoutSmall: { backgroundColor: '#ef4444', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  logoutText: { color: '#fff', fontWeight: '700' },
});
