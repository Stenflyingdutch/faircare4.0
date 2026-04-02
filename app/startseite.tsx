import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';

export default function StartseiteScreen() {
  const { logout, user } = useAuth();
  const { session, sharedResult, initiatorResult } = useMentalLoadFlow();

  const partnerDone = session.anonymousQuizSession.partnerQuizCompleted && Boolean(session.partnerUser?.email);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Startseite</Text>
        <Pressable style={styles.logoutSmall} onPress={logout}><Text style={styles.logoutText}>Logout</Text></Pressable>
      </View>
      <Text style={styles.text}>Hallo {user?.email ?? 'Gast'}.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Individuelles Ergebnis</Text>
        <Text>Dein Anteil am Mitdenken im Alltag: {initiatorResult.totalScore}%</Text>
        <Pressable style={styles.inlineButton} onPress={() => router.push('/eigenes-ergebnis' as never)}>
          <Text style={styles.inlineButtonText}>Individuelles Ergebnis öffnen</Text>
        </Pressable>
      </View>

      {!partnerDone && (
        <View style={styles.notification}>
          <Text style={styles.notificationTitle}>Partner noch nicht fertig</Text>
          <Text style={styles.text}>Teile den Code mit deinem Partner. Sobald er das Quiz abgeschlossen hat, erscheinen eure gemeinsamen Ergebnisse hier.</Text>
          <Pressable style={styles.inlineButton} onPress={() => router.push('/einladungscode' as never)}>
            <Text style={styles.inlineButtonText}>Einladungscode anzeigen</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => router.push('/partner-einladen' as never)}>
            <Text style={styles.secondaryText}>Partner einladen</Text>
          </Pressable>
        </View>
      )}

      {partnerDone && (
        <View style={styles.notification}>
          <Text style={styles.notificationTitle}>Eure gemeinsamen Ergebnisse sind bereit</Text>
          <Text style={styles.text}>Dein Partner hat das Quiz gemacht. Hier sind eure gemeinsamen Ergebnisse.</Text>
          <Pressable style={styles.inlineButton} onPress={() => router.push('/gemeinsames-ergebnis' as never)}>
            <Text style={styles.inlineButtonText}>Gemeinsame Ergebnisse anschauen</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.card}><Text style={styles.cardTitle}>Aktive Ziele</Text><Text>{session.goals.join(' · ') || 'Noch keine Ziele'}</Text></View>
      <View style={styles.card}><Text style={styles.cardTitle}>Aufgaben</Text><Text>{session.tasks.filter((item) => item.owner).length} Aufgaben mit klarer Ownership</Text></View>
      <View style={styles.card}><Text style={styles.cardTitle}>Weekly Review</Text><Text>{session.weeklyReview.upcomingAt ?? 'Noch nicht geplant'}</Text></View>

      <Pressable style={styles.primary} onPress={() => router.push('/weekly-review' as never)}><Text style={styles.primaryText}>Zur Weekly Review</Text></Pressable>
      {sharedResult && <Pressable style={styles.primary} onPress={() => router.push('/gemeinsames-ergebnis' as never)}><Text style={styles.primaryText}>Gemeinsame Ergebnisse</Text></Pressable>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 30, fontWeight: '700' },
  text: { color: '#334155' },
  card: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, gap: 6 },
  cardTitle: { fontWeight: '700' },
  notification: { borderWidth: 1, borderColor: '#93c5fd', backgroundColor: '#eff6ff', borderRadius: 10, padding: 12, gap: 8 },
  notificationTitle: { fontWeight: '700', color: '#1e3a8a' },
  inlineButton: { backgroundColor: '#2563eb', borderRadius: 8, padding: 10 },
  inlineButtonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  primary: { backgroundColor: '#2563eb', borderRadius: 10, padding: 12 },
  primaryText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  secondary: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10 },
  secondaryText: { textAlign: 'center', fontWeight: '600' },
  logoutSmall: { backgroundColor: '#ef4444', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  logoutText: { color: '#fff', fontWeight: '700' },
});
