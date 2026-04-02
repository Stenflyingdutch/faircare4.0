import { router, Redirect, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';

type MainTab = 'startseite' | 'ziele' | 'aufgaben' | 'review';

const TAB_ITEMS: { key: MainTab; label: string }[] = [
  { key: 'startseite', label: 'Startseite' },
  { key: 'ziele', label: 'Ziele' },
  { key: 'aufgaben', label: 'Aufgaben' },
  { key: 'review', label: 'Review' },
];

const GOAL_STATUS: Record<string, string> = {
  'Weniger für alles mitdenken müssen': 'aktiv',
  'Klare Verantwortlichkeiten im Alltag': 'in Bearbeitung',
  'Weniger Rückfragen und Erinnerungen': 'aktiv',
  'Routinen stabil und planbar': 'pausiert',
  'Bessere Vorbereitung im Alltag': 'aktiv',
};

export default function StartseiteScreen() {
  const { user } = useAuth();
  const { session, addTask, updateTask, removeTask, setupStatus, getInviteCode, addGoal, updateGoal, removeGoal } = useMentalLoadFlow();
  const params = useLocalSearchParams<{ fromLogin?: string }>();
  const [activeTab, setActiveTab] = useState<MainTab>('startseite');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [goalDraft, setGoalDraft] = useState('');
  const [editingGoalIndex, setEditingGoalIndex] = useState<number | null>(null);

  if (!user) {
    return <Redirect href={'/' as never} />;
  }

  const isInitiator = session.initiatorUser?.email?.toLowerCase() === user.email?.toLowerCase();
  const ownOwner = isInitiator ? 'initiator' : 'partner';
  const initiatorName = session.initiatorUser?.displayName || 'Initiator';
  const partnerName = session.partnerUser?.displayName || 'Partner';
  const ownTasks = useMemo(() => session.tasks.filter((task) => task.owner === ownOwner), [ownOwner, session.tasks]);
  const allAssignedTasks = useMemo(() => session.tasks.filter((task) => task.owner !== null), [session.tasks]);
  const allowMainFromLogin = params.fromLogin === 'true';

  const addNewTask = () => {
    const clean = newTaskTitle.trim();
    if (!clean) {
      return;
    }
    addTask(clean, ownOwner);
    setNewTaskTitle('');
  };

  const loginResumeMode = allowMainFromLogin && !setupStatus.hatQuizAbgeschlossen;

  const nextAction = () => {
    if (loginResumeMode) {
      return { label: 'Eigenes Ergebnis ansehen', route: '/eigenes-ergebnis' };
    }
    if (!setupStatus.hatQuizAbgeschlossen) {
      return { label: 'Quiz starten', route: '/quiz-intro' };
    }
    if (!setupStatus.istRegistriert) {
      return { label: 'Registrierung abschließen', route: '/registrieren' };
    }
    if (!setupStatus.gemeinsamesErgebnisVerfuegbar) {
      return { label: 'Partner einladen', route: '/partner-einladen' };
    }
    if (!setupStatus.zieleFestgelegt) {
      return { label: 'Ziele festlegen', route: '/ziele-auswahl' };
    }
    if (!setupStatus.aufgabenZugeordnet) {
      return { label: 'Aufgaben zuordnen', route: '/aufgaben' };
    }
    return { label: 'Zum Dashboard', route: '/startseite' };
  };

  if (!setupStatus.setupAbgeschlossen) {
    const action = nextAction();

    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Startseite</Text>
          <Pressable style={styles.iconButton} onPress={() => router.push('/einstellungen' as never)}>
            <Text style={styles.iconText}>⚙️</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Euer Setup läuft</Text>
          <Text style={styles.text}>Tabs werden aktiviert, sobald gemeinsames Ergebnis, Ziele und Aufgaben abgeschlossen sind.</Text>
          <Pressable style={styles.primary} onPress={() => router.push(action.route as never)}>
            <Text style={styles.primaryText}>{action.label}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dein aktueller Stand</Text>
          <Pressable onPress={() => router.push('/eigenes-ergebnis' as never)}>
            <Text style={styles.link}>Individuelles Ergebnis ansehen</Text>
          </Pressable>
          <Text style={styles.text}>Einladungscode: {getInviteCode()}</Text>
          <Text style={styles.text}>Partnerstatus: {session.pairOrHouseholdContext.inviteStatus}</Text>
          <Pressable onPress={() => router.push('/partner-einladen' as never)}>
            <Text style={styles.link}>Partner verknüpfen</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vergleich</Text>
          <Text style={styles.text}>
            {setupStatus.gemeinsamesErgebnisVerfuegbar
              ? 'Gemeinsames Ergebnis ist verfügbar.'
              : 'Partner-Ergebnis fehlt noch. Der Vergleich erscheint automatisch, sobald es vorliegt.'}
          </Text>
          {setupStatus.gemeinsamesErgebnisVerfuegbar && (
            <Pressable onPress={() => router.push('/gemeinsames-ergebnis' as never)}>
              <Text style={styles.link}>Gemeinsames Ergebnis ansehen</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <View style={styles.mainContent}>
        {activeTab === 'startseite' && (
          <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>Startseite</Text>
              <Pressable style={styles.iconButton} onPress={() => router.push('/einstellungen' as never)}>
                <Text style={styles.iconText}>⚙️</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Eure aktiven Ziele</Text>
              {session.goals.slice(0, 3).map((goal) => (
                <Text key={goal} style={styles.listItem}>• {goal}</Text>
              ))}
              {session.goals.length === 0 && <Text style={styles.text}>Noch keine aktiven Ziele.</Text>}
              <Pressable onPress={() => setActiveTab('ziele')}>
                <Text style={styles.link}>Alle Ziele ansehen</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Deine Aufgaben</Text>
              {ownTasks.slice(0, 5).map((task) => (
                <Text key={task.id} style={styles.listItem}>• {task.title}</Text>
              ))}
              {ownTasks.length === 0 && <Text style={styles.text}>Dir sind aktuell keine Aufgaben zugeordnet.</Text>}
              <Pressable onPress={() => setActiveTab('aufgaben')}>
                <Text style={styles.link}>Alle Aufgaben ansehen</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}

        {activeTab === 'ziele' && (
          <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Eure Ziele</Text>
            {session.goals.map((goal, index) => (
              <View key={`${goal}-${index}`} style={styles.card}>
                <Text style={styles.cardTitle}>{goal}</Text>
                <Text style={styles.text}>Status: {GOAL_STATUS[goal] ?? 'aktiv'}</Text>
                <Text style={styles.text}>Kategoriebezug: Mental-Load Alltag</Text>
                <View style={styles.row}>
                  <Pressable style={styles.secondary} onPress={() => { setEditingGoalIndex(index); setGoalDraft(goal); }}><Text>Bearbeiten</Text></Pressable>
                  <Pressable style={styles.secondary} onPress={() => removeGoal(index)}><Text>Löschen</Text></Pressable>
                </View>
              </View>
            ))}
            {session.goals.length === 0 && <Text style={styles.text}>Noch keine Ziele ausgewählt.</Text>}
            <View style={styles.card}>
              <TextInput placeholder="Neues Ziel" value={goalDraft} onChangeText={setGoalDraft} style={styles.input} />
              <Pressable
                style={styles.primary}
                onPress={() => {
                  const clean = goalDraft.trim();
                  if (!clean) return;
                  if (editingGoalIndex === null) {
                    addGoal(clean);
                  } else {
                    updateGoal(editingGoalIndex, clean);
                    setEditingGoalIndex(null);
                  }
                  setGoalDraft('');
                }}
              >
                <Text style={styles.primaryText}>{editingGoalIndex === null ? 'Neues Ziel hinzufügen' : 'Ziel speichern'}</Text>
              </Pressable>
            </View>
            <Pressable style={styles.secondary} onPress={() => router.push('/ziele-auswahl' as never)}>
              <Text style={styles.secondaryText}>Ziele anpassen</Text>
            </Pressable>
          </ScrollView>
        )}

        {activeTab === 'aufgaben' && (
          <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Aufgaben</Text>
            {session.tasks.map((task) => (
              <View key={task.id} style={styles.card}>
                <Text style={styles.cardTitle}>{task.title}</Text>
                <Text style={styles.text}>Verantwortlich: {task.owner === 'initiator' ? initiatorName : task.owner === 'partner' ? partnerName : 'Nicht zugeordnet'}</Text>
                <Text style={styles.text}>Kategorie: {task.category}</Text>
                <View style={styles.row}>
                  <Pressable style={styles.secondary} onPress={() => updateTask(task.id, { status: 'aktiv' })}><Text>Aktiv</Text></Pressable>
                  <Pressable style={styles.secondary} onPress={() => updateTask(task.id, { status: 'pausiert' })}><Text>Pausieren</Text></Pressable>
                  <Pressable style={styles.secondary} onPress={() => removeTask(task.id)}><Text>Löschen</Text></Pressable>
                </View>
              </View>
            ))}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Neue Aufgabe hinzufügen</Text>
              <TextInput placeholder="Aufgabe eingeben" value={newTaskTitle} onChangeText={setNewTaskTitle} style={styles.input} />
              <Pressable style={styles.primary} onPress={addNewTask}>
                <Text style={styles.primaryText}>Neue Aufgabe hinzufügen</Text>
              </Pressable>
            </View>
            <Text style={styles.text}>Gesamt mit Ownership: {allAssignedTasks.length} von {session.tasks.length}</Text>
          </ScrollView>
        )}

        {activeTab === 'review' && (
          <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Review</Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Quiz-Ergebnisse als Referenz</Text>
              <Pressable onPress={() => router.push('/eigenes-ergebnis' as never)}><Text style={styles.link}>Individuelles Ergebnis ansehen</Text></Pressable>
              <Pressable onPress={() => router.push('/gemeinsames-ergebnis' as never)}><Text style={styles.link}>Gemeinsames Ergebnis ansehen</Text></Pressable>
            </View>
          </ScrollView>
        )}
      </View>

      <View style={styles.tabBar}>
        {TAB_ITEMS.map((item) => (
          <Pressable key={item.key} style={styles.tabBarItem} onPress={() => setActiveTab(item.key)}>
            <Text style={[styles.tabBarText, activeTab === item.key && styles.tabBarTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  mainContent: { flex: 1 },
  container: { padding: 24, gap: 12 },
  title: { fontSize: 30, fontWeight: '700' },
  card: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, gap: 8 },
  cardTitle: { fontWeight: '700', fontSize: 17 },
  text: { color: '#334155' },
  listItem: { color: '#0f172a' },
  link: { color: '#1d4ed8', fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, backgroundColor: '#fff' },
  primary: { backgroundColor: '#2563eb', borderRadius: 10, padding: 12 },
  primaryText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  secondary: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12 },
  secondaryText: { textAlign: 'center', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 18 },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  tabBarItem: { flex: 1, paddingVertical: 12 },
  tabBarText: { textAlign: 'center', color: '#475569', fontWeight: '600' },
  tabBarTextActive: { color: '#1d4ed8' },
});
