import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function QuizIntroScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = params.mode === 'partner' ? 'partner' : 'initiator';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wer denkt an was im Alltag</Text>
      <Text style={styles.text}>Beantworte die Fragen aus deiner Sicht.</Text>
      <Text style={styles.text}>Es geht nicht darum, wer etwas macht.</Text>
      <Text style={styles.text}>Sondern wer daran denkt, plant und den Überblick behält.</Text>
      <Pressable style={styles.cta} onPress={() => router.push({ pathname: '/quiz', params: { mode } } as never)}>
        <Text style={styles.ctaText}>Quiz starten</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 10 },
  title: { fontSize: 30, fontWeight: '700' },
  text: { color: '#334155' },
  cta: { marginTop: 12, backgroundColor: '#2563eb', borderRadius: 10, padding: 14 },
  ctaText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
