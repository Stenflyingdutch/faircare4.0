import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';

export default function StartseiteScreen() {
  const { logout, user } = useAuth();
  const { session } = useMentalLoadFlow();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Startseite</Text>
      <Text style={styles.text}>Hallo {user?.email ?? 'Gast'}.</Text>

      {session.notificationState.partnerCompleted && (
        <View style={styles.notification}>
          <Text style={styles.notificationTitle}>Dein Partner hat das Quiz abgeschlossen.</Text>
          <Text style={styles.text}>Bitte beide über die Login-Seite mit Kennwort anmelden, dann ist die gemeinsame Bewertung sichtbar.</Text>
          <Pressable style={styles.inlineButton} onPress={() => router.push('/gemeinsames-ergebnis' as never)}>
            <Text style={styles.inlineButtonText}>Gemeinsames Ergebnis öffnen</Text>
          </Pressable>
        </View>
      )}


      {session.notificationState.completionMailSent && (
        <View style={styles.notification}>
          <Text style={styles.notificationTitle}>E-Mail-Benachrichtigung wurde ausgelöst.</Text>
          <Text style={styles.text}>Der Abschluss des Partner-Quiz wurde per E-Mail angekündigt.</Text>
        </View>
      )}
      <View style={styles.card}><Text style={styles.cardTitle}>Eure aktiven Ziele</Text><Text>{session.goals.join(' · ') || 'Noch keine Ziele'}</Text></View>
      <View style={styles.card}><Text style={styles.cardTitle}>Eure Aufgaben</Text><Text>{session.tasks.filter((item) => item.owner).length} Aufgaben mit Ownership</Text></View>
      <View style={styles.card}><Text style={styles.cardTitle}>Nächstes Weekly Review</Text><Text>{session.weeklyReview.upcomingAt ?? 'Noch nicht geplant'}</Text></View>
      <View style={styles.card}><Text style={styles.cardTitle}>Letzte Änderungen</Text><Text>{session.weeklyReview.lastCompletedAt ?? 'Noch keine Änderungen'}</Text></View>

      <Pressable style={styles.primary} onPress={() => router.push('/weekly-review' as never)}><Text style={styles.primaryText}>Weekly Review starten</Text></Pressable>
      <Pressable style={styles.secondary} onPress={() => router.push('/partner-einladen' as never)}><Text style={styles.secondaryText}>Partner einladen</Text></Pressable>
      <Pressable style={styles.logout} onPress={logout}><Text style={styles.primaryText}>Abmelden</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 10 },
  title: { fontSize: 30, fontWeight: '700' },
  text: { color: '#334155' },
  card: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, gap: 4 },
  cardTitle: { fontWeight: '700' },
  notification: { borderWidth: 1, borderColor: '#93c5fd', backgroundColor: '#eff6ff', borderRadius: 10, padding: 12, gap: 6 },
  notificationTitle: { fontWeight: '700', color: '#1e3a8a' },
  inlineButton: { backgroundColor: '#2563eb', borderRadius: 8, padding: 10 },
  inlineButtonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  primary: { backgroundColor: '#2563eb', borderRadius: 10, padding: 12 },
  primaryText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  secondary: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12 },
  secondaryText: { textAlign: 'center', fontWeight: '600' },
  logout: { backgroundColor: '#ef4444', borderRadius: 10, padding: 12 },
});
