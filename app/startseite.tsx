import { router, Redirect } from 'expo-router';
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

function setupLabel(route: string) {
  switch (route) {
    case '/quiz-intro':
      return 'Quiz starten';
    case '/registrieren':
      return 'Registrierung abschließen';
    case '/eigenes-ergebnis':
      return 'Individuelles Ergebnis ansehen';
    case '/partner-einladen':
      return 'Partner verknüpfen';
    case '/gemeinsames-ergebnis':
      return 'Gemeinsame Ergebnisse ansehen';
    case '/ziele-auswahl':
      return 'Ziele festlegen';
    default:
      return 'Aufgaben zuordnen';
  }
}

export default function StartseiteScreen() {
  const { user } = useAuth();
  const { session, addTask, setupStatus, nextSetupRoute } = useMentalLoadFlow();
  const [activeTab, setActiveTab] = useState<MainTab>('startseite');
  const [newTaskTitle, setNewTaskTitle] = useState('');

  if (!user) {
    return <Redirect href={'/' as never} />;
  }

  const isInitiator = session.initiatorUser?.email?.toLowerCase() === user.email?.toLowerCase();
  const ownOwner = isInitiator ? 'initiator' : 'partner';

  const ownTasks = useMemo(() => session.tasks.filter((task) => task.owner === ownOwner), [ownOwner, session.tasks]);
  const allAssignedTasks = useMemo(() => session.tasks.filter((task) => task.owner !== null), [session.tasks]);

  const addNewTask = () => {
    const clean = newTaskTitle.trim();
    if (!clean) {
      return;
    }
    addTask(clean, ownOwner);
    setNewTaskTitle('');
  };

  if (!setupStatus.setupAbgeschlossen) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Startseite</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Setup ist noch nicht abgeschlossen</Text>
          <Text style={styles.text}>Die Hauptnavigation mit Tabs wird freigeschaltet, sobald ihr Quiz, Verknüpfung, Ziele und Aufgaben vollständig abgeschlossen habt.</Text>
          <Pressable style={styles.primary} onPress={() => router.push(nextSetupRoute as never)}>
            <Text style={styles.primaryText}>{setupLabel(nextSetupRoute)}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nächster sinnvoller Schritt</Text>
          <Text style={styles.text}>Status Quiz: {setupStatus.hatQuizAbgeschlossen ? 'erledigt' : 'offen'}</Text>
          <Text style={styles.text}>Status Registrierung: {setupStatus.istRegistriert ? 'erledigt' : 'offen'}</Text>
          <Text style={styles.text}>Status Partner: {setupStatus.partnerVerbunden ? 'verbunden' : 'nicht verbunden'}</Text>
          <Text style={styles.text}>Gemeinsames Ergebnis: {setupStatus.gemeinsamesErgebnisVerfuegbar ? 'verfügbar' : 'offen'}</Text>
          <Text style={styles.text}>Ziele festgelegt: {setupStatus.zieleFestgelegt ? 'ja' : 'nein'}</Text>
          <Text style={styles.text}>Aufgaben zugeordnet: {setupStatus.aufgabenZugeordnet ? 'ja' : 'nein'}</Text>
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
            {session.goals.map((goal) => (
              <View key={goal} style={styles.card}>
                <Text style={styles.cardTitle}>{goal}</Text>
                <Text style={styles.text}>Status: {GOAL_STATUS[goal] ?? 'aktiv'}</Text>
                <Text style={styles.text}>Kategoriebezug: Mental-Load Alltag</Text>
              </View>
            ))}
            {session.goals.length === 0 && <Text style={styles.text}>Noch keine Ziele ausgewählt.</Text>}
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
                <Text style={styles.text}>Verantwortlich: {task.owner === 'initiator' ? 'Ich' : task.owner === 'partner' ? 'Partner' : 'Nicht zugeordnet'}</Text>
                <Text style={styles.text}>Zugeordnetes Ziel: {session.goals[0] ?? 'Noch kein Ziel zugeordnet'}</Text>
                <Text style={styles.text}>Status: {task.owner ? 'aktiv' : 'offen'}</Text>
              </View>
            ))}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Neue Aufgabe hinzufügen</Text>
              <TextInput
                placeholder="Aufgabe eingeben"
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                style={styles.input}
              />
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

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Weekly Review</Text>
              <Pressable style={styles.primary} onPress={() => router.push('/weekly-review' as never)}>
                <Text style={styles.primaryText}>Jetzt starten</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Letzte Reviews</Text>
              {session.weeklyReviewAnswers.length === 0 && <Text style={styles.text}>Noch kein Weekly Review abgeschlossen.</Text>}
              {session.weeklyReviewAnswers.slice(-3).reverse().map((review, index) => (
                <Text key={`review-${index}`} style={styles.text}>• Review #{session.weeklyReviewAnswers.length - index}: {review.positives[0] ?? 'ohne Eintrag'}</Text>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Offene Punkte</Text>
              <Text style={styles.text}>• Ziel anpassen</Text>
              <Text style={styles.text}>• Aufgabe neu zuweisen</Text>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 18 },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  tabBarItem: { flex: 1, paddingVertical: 12 },
  tabBarText: { textAlign: 'center', color: '#475569', fontWeight: '600' },
  tabBarTextActive: { color: '#1d4ed8' },
});
