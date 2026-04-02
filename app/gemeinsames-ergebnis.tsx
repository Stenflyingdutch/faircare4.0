import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';

export default function GemeinsamesErgebnisScreen() {
  const { session } = useMentalLoadFlow();

  const hasMinimumRegistration = Boolean(session.initiatorUser?.email && session.partnerUser?.email);
  const hasBothPasswords = session.passwordSetup.initiator && session.passwordSetup.partner;

  if (!session.notificationState.partnerCompleted || !hasMinimumRegistration) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Euer Mental Load im Alltag</Text>
        <Text style={styles.text}>Gemeinsames Ergebnis wird freigeschaltet, sobald der Partner das Quiz abgesendet hat und beide mit Name + E-Mail registriert sind.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Euer Mental Load im Alltag</Text>
      <Text style={styles.text}>Du trägst aktuell einen größeren Teil des Mental Load.</Text>
      <Text style={styles.text}>Es geht nicht darum, wer mehr macht. Sondern wer mehr im Kopf hat.</Text>
      <Text style={styles.ratio}>65 / 35</Text>
      <Text style={styles.text}>Anteil am Mitdenken im Alltag</Text>
      <Text style={styles.section}>Hier seht ihr es unterschiedlich.</Text>
      <Text style={styles.section}>Hier fehlt klare Verantwortung.</Text>
      {!hasBothPasswords && (
        <Text style={styles.text}>Die Einordnung in Relation zu euren individuellen Bewertungen wird nach Kennwort-Festlegung für beide sichtbar.</Text>
      )}
      {hasBothPasswords && (
        <Text style={styles.text}>Relation zur eigenen Bewertung: Eure Selbstwahrnehmung und das gemeinsame Bild sind jetzt vollständig verfügbar.</Text>
      )}
      <Pressable style={styles.button} onPress={() => router.push('/ziele-auswahl' as never)}>
        <Text style={styles.buttonText}>Ziele festlegen</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8 },
  title: { fontSize: 30, fontWeight: '700' },
  text: { color: '#334155' },
  ratio: { fontSize: 40, fontWeight: '700', color: '#1d4ed8', marginTop: 8 },
  section: { marginTop: 8, fontWeight: '600' },
  button: { marginTop: 'auto', backgroundColor: '#2563eb', borderRadius: 10, padding: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
