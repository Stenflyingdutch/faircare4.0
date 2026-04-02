import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';

export default function GemeinsamesErgebnisScreen() {
  const { session } = useMentalLoadFlow();

  if (!session.notificationState.partnerCompleted || !session.passwordSetup.initiator || !session.passwordSetup.partner) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Euer Mental Load im Alltag</Text>
        <Text style={styles.text}>Gemeinsames Ergebnis wird freigeschaltet, sobald beide Quiz abgesendet und beide Kennwörter über die Login-Seite gesetzt haben.</Text>
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
