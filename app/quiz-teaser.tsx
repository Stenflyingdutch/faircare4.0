import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function QuizTeaserScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Deine erste Einschätzung ist fertig</Text>
      <Text style={styles.text}>Deine Antworten zeigen, dass du aktuell viele Themen im Kopf hast.</Text>
      <Text style={styles.text}>
        Mental Load bedeutet, an Dinge zu denken, voraus zu planen und den Überblick zu behalten. Auch dann, wenn nichts aktiv erledigt wird.
      </Text>
      <Text style={styles.text}>Für dein vollständiges Ergebnis registriere dich jetzt.</Text>
      <Pressable style={styles.cta} onPress={() => router.push('/registrieren' as never)}>
        <Text style={styles.ctaText}>Ergebnis freischalten</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 10 },
  title: { fontSize: 30, fontWeight: '700' },
  text: { color: '#334155' },
  cta: { marginTop: 10, backgroundColor: '#2563eb', borderRadius: 10, padding: 14 },
  ctaText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
