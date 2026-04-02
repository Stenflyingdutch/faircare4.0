import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function StartScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wer denkt bei euch an alles im Alltag mit Kindern</Text>
      <Text style={styles.text}>
        Beantworte ein kurzes Quiz und mache sichtbar, wie sich euer Mental Load verteilt.
      </Text>
      <Pressable style={styles.cta} onPress={() => router.push('/kinderanzahl' as never)}>
        <Text style={styles.ctaText}>Los geht’s</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 32, fontWeight: '700' },
  text: { fontSize: 16, color: '#334155' },
  cta: { backgroundColor: '#2563eb', borderRadius: 10, padding: 14 },
  ctaText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
