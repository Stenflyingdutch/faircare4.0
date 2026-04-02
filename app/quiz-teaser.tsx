import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';
import { saveMentalLoadAnswers } from '@/services/mentalLoadPersistenceService';

export default function QuizTeaserScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = params.mode === 'partner' ? 'partner' : 'initiator';
  const { user } = useAuth();
  const { session, initiatorResult, partnerResult } = useMentalLoadFlow();

  const result = mode === 'partner' ? partnerResult : initiatorResult;
  const requiresRegistrationForDetails = mode === 'initiator' ? !session.initiatorUser : !session.partnerUser;

  const handleContinue = async () => {
    if (user?.uid) {
      await saveMentalLoadAnswers(user.uid, {
        initiatorAnswers: session.anonymousQuizSession.initiatorAnswers,
        partnerAnswers: session.anonymousQuizSession.partnerAnswers,
        initiatorQuizCompleted: session.anonymousQuizSession.initiatorQuizCompleted,
        partnerQuizCompleted: session.anonymousQuizSession.partnerQuizCompleted,
      });
    }

    if (requiresRegistrationForDetails) {
      router.push({ pathname: '/registrieren', params: { mode } } as never);
      return;
    }

    router.push({ pathname: '/eigenes-ergebnis', params: { mode } } as never);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Deine erste Einschätzung ist fertig</Text>
      <Text style={styles.text}>Deine Antworten zeigen, dass du aktuell viele Themen im Kopf hast.</Text>
      <Text style={styles.text}>
        Mental Load bedeutet, an Dinge zu denken, voraus zu planen und den Überblick zu behalten. Auch dann, wenn nichts aktiv erledigt wird.
      </Text>

      <View style={styles.resultCard}>
        <Text style={styles.resultLabel}>Gesamtergebnis (erste Einschätzung)</Text>
        <Text style={styles.resultValue}>{result.totalScore}%</Text>
      </View>

      <Text style={styles.text}>
        {requiresRegistrationForDetails
          ? 'Für die Detailansicht registriere dich jetzt.'
          : 'Du kannst jetzt deine Detailansicht öffnen.'}
      </Text>

      <Pressable style={styles.cta} onPress={handleContinue}>
        <Text style={styles.ctaText}>{requiresRegistrationForDetails ? 'Für Details registrieren' : 'Details ansehen'}</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 10 },
  title: { fontSize: 30, fontWeight: '700' },
  text: { color: '#334155' },
  resultCard: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, gap: 4, backgroundColor: '#f8fafc' },
  resultLabel: { color: '#334155' },
  resultValue: { fontSize: 30, fontWeight: '700', color: '#1d4ed8' },
  cta: { marginTop: 10, backgroundColor: '#2563eb', borderRadius: 10, padding: 14 },
  ctaText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
