import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';

export default function GemeinsamesErgebnisScreen() {
  const { sharedResult } = useMentalLoadFlow();

  if (!sharedResult) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Euer Mental Load im Alltag</Text>
        <Text style={styles.text}>Gemeinsame Ergebnisse werden freigeschaltet, sobald ihr beide Quiz und Registrierung abgeschlossen habt.</Text>
      </View>
    );
  }

  const message =
    sharedResult.initiatorShare >= sharedResult.partnerShare
      ? 'Du trägst aktuell einen größeren Teil des Mental Load.'
      : 'Dein Partner trägt aktuell einen größeren Teil des Mental Load.';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Euer Mental Load im Alltag</Text>
      <Text style={styles.text}>{message}</Text>
      <Text style={styles.text}>Es geht nicht darum, wer mehr macht. Sondern wer mehr im Kopf hat.</Text>

      <Text style={styles.section}>Gesamtvergleich</Text>
      <View style={styles.card}>
        <Text>Dein Anteil am Mitdenken im Alltag: {sharedResult.initiatorShare}%</Text>
        <Text>Anteil deines Partners am Mitdenken im Alltag: {sharedResult.partnerShare}%</Text>
      </View>

      <Text style={styles.section}>Hier seht ihr es unterschiedlich</Text>
      {sharedResult.categoryComparisons.filter((item) => item.highDifference).map((item) => (
        <View key={`diff-${item.category}`} style={styles.card}>
          <Text style={styles.cardTitle}>{item.category}</Text>
          <Text>Du: {item.initiatorScore}% · Partner: {item.partnerScore}%</Text>
          <Text style={styles.mark}>Deutliche Differenz</Text>
          {item.stressFlag && <Text style={styles.warning}>Hoher Stress in dieser Kategorie</Text>}
        </View>
      ))}

      <Text style={styles.section}>Hier fehlt klare Verantwortung</Text>
      {sharedResult.categoryComparisons.filter((item) => item.ownershipUnclear).map((item) => (
        <View key={`unclear-${item.category}`} style={styles.card}>
          <Text style={styles.cardTitle}>{item.category}</Text>
          <Text>Häufig „Beide“ oder ähnliche Einschätzungen</Text>
        </View>
      ))}

      <Pressable style={styles.button} onPress={() => router.push('/ziele-auswahl' as never)}>
        <Text style={styles.buttonText}>Ziele festlegen</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 8 },
  title: { fontSize: 30, fontWeight: '700' },
  text: { color: '#334155' },
  section: { marginTop: 8, fontWeight: '700' },
  card: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, gap: 4 },
  cardTitle: { fontWeight: '700' },
  mark: { color: '#1d4ed8', fontWeight: '700' },
  warning: { color: '#b45309' },
  button: { marginTop: 12, backgroundColor: '#2563eb', borderRadius: 10, padding: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
