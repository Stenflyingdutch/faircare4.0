import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function QuizTeaserScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = params.mode === 'partner' ? 'partner' : 'initiator';
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Deine erste Einschätzung ist fertig</Text>
      <Text style={styles.text}>Deine Antworten zeigen, dass du aktuell viele Themen im Kopf hast.</Text>
      <Text style={styles.text}>
        Mental Load bedeutet, an Dinge zu denken, voraus zu planen und den Überblick zu behalten. Auch dann, wenn nichts aktiv erledigt wird.
      </Text>
      <Text style={styles.text}>
        {user
          ? 'Dein Konto ist bereits aktiv. Du kannst direkt dein Ergebnis ansehen.'
          : 'Für dein vollständiges Ergebnis registriere dich jetzt.'}
      </Text>
      <Pressable
        style={styles.cta}
        onPress={() =>
          router.push(
            (user ? { pathname: '/eigenes-ergebnis', params: { mode } } : { pathname: '/registrieren', params: { mode } }) as never,
          )
        }
      >
        <Text style={styles.ctaText}>{user ? 'Ergebnis ansehen' : 'Ergebnis freischalten'}</Text>
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
