import { router, Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';
import { loadMentalLoadAnswers } from '@/services/mentalLoadPersistenceService';
import { collectionNames, getCurrentUserFamilyId } from '@/services/familyService';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

type MainTab = 'startseite' | 'ziele' | 'aufgaben' | 'review';

const TAB_ITEMS: { key: MainTab; label: string }[] = [
  { key: 'startseite', label: 'Start' },
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
  const {
    session,
    addTask,
    updateTask,
    removeTask,
    setupStatus,
    setInviteCode,
    saveInitiatorUser,
    savePartnerUser,
    hydrateAnswers,
    addGoal,
    updateGoal,
    removeGoal,
  } = useMentalLoadFlow();

  const [activeTab, setActiveTab] = useState<MainTab>('startseite');
  const params = useLocalSearchParams<{ tab?: MainTab }>();
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

  const addNewTask = () => {
    const clean = newTaskTitle.trim();
    if (!clean) {
      return;
    }
    addTask(clean, ownOwner);
    setNewTaskTitle('');
  };

  useEffect(() => {
    const syncFamilyContext = async () => {
      if (!user?.uid) {
        return;
      }

      const familyId = await getCurrentUserFamilyId(user.uid);
      if (!familyId) {
        return;
      }

      const familySnapshot = await getDoc(doc(db, collectionNames.families, familyId));
      const familyData = familySnapshot.data() as { inviteCode?: string; memberIds?: string[] } | undefined;

      if (familyData?.inviteCode) {
        setInviteCode(familyData.inviteCode);
      }

      const memberIds = familyData?.memberIds ?? [];
      if (memberIds.length === 0) {
        return;
      }

      const initiatorUid = memberIds[0];
      const partnerUid = memberIds.find((memberId) => memberId !== initiatorUid) ?? null;

      const initiatorAnswers = await loadMentalLoadAnswers(initiatorUid);
      hydrateAnswers('initiator', initiatorAnswers.initiatorAnswers, initiatorAnswers.initiatorQuizCompleted);

      if (partnerUid) {
        const partnerAnswers = await loadMentalLoadAnswers(partnerUid);
        const partnerProfileSnapshot = await getDoc(doc(db, collectionNames.users, partnerUid));
        const partnerProfile = partnerProfileSnapshot.data() as { displayName?: string; email?: string } | undefined;

        savePartnerUser({
          id: partnerUid,
          displayName: partnerProfile?.displayName ?? 'Partner',
          email: partnerProfile?.email ?? '',
        });

        hydrateAnswers('partner', partnerAnswers.partnerAnswers, partnerAnswers.partnerQuizCompleted);
      }

      const ownProfileSnapshot = await getDoc(doc(db, collectionNames.users, user.uid));
      const ownProfile = ownProfileSnapshot.data() as { displayName?: string; email?: string } | undefined;
      saveInitiatorUser({ id: user.uid, displayName: ownProfile?.displayName ?? 'Ich', email: ownProfile?.email ?? user.email ?? '' });
    };

    syncFamilyContext();
  }, [hydrateAnswers, saveInitiatorUser, savePartnerUser, setInviteCode, user?.uid, user?.email]);

  useEffect(() => {
    if (params.tab && TAB_ITEMS.some((item) => item.key === params.tab)) {
      setActiveTab(params.tab);
    }
  }, [params.tab]);

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

            {!setupStatus.setupAbgeschlossen && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Euer Setup läuft</Text>
                <Text style={styles.text}>Als nächstes: Ziele festlegen und Aufgaben fair verteilen.</Text>
              </View>
            )}

            <View style={[styles.card, styles.highlightCard]}>
              <Text style={styles.cardTitle}>Eure aktiven Ziele</Text>
              {session.goals.slice(0, 3).map((goal) => (
                <Text key={goal} style={styles.listItem}>• {goal}</Text>
              ))}
              {session.goals.length === 0 && <Text style={styles.text}>Noch keine aktiven Ziele.</Text>}
              <Pressable onPress={() => setActiveTab('ziele')}>
                <Text style={styles.link}>Zum Tab Ziele</Text>
              </Pressable>
            </View>

            <View style={[styles.card, styles.highlightCard]}>
              <Text style={styles.cardTitle}>Deine Aufgaben</Text>
              {ownTasks.slice(0, 5).map((task) => (
                <Text key={task.id} style={styles.listItem}>• {task.title}</Text>
              ))}
              {ownTasks.length === 0 && <Text style={styles.text}>Dir sind aktuell keine Aufgaben zugeordnet.</Text>}
              <Pressable onPress={() => setActiveTab('aufgaben')}>
                <Text style={styles.link}>Zum Tab Aufgaben</Text>
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
            <View style={styles.card}>
              <TextInput placeholder="Eigenes Ziel hinzufügen" value={goalDraft} onChangeText={setGoalDraft} style={styles.input} />
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
              <Text style={styles.secondaryText}>Vorschläge auswählen</Text>
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
  highlightCard: { padding: 18, minHeight: 170, justifyContent: 'space-between' },
  cardTitle: { fontWeight: '700', fontSize: 17 },
  text: { color: '#334155' },
  listItem: { color: '#0f172a', fontSize: 18, lineHeight: 26 },
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
