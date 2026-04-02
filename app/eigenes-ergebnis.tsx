import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';

export default function EigenesErgebnisScreen() {
  const { session, submitPartnerResult } = useMentalLoadFlow();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isPartner = params.mode === 'partner';
  const total = session.anonymousQuizSession.answers.length;
  const ich = session.anonymousQuizSession.answers.filter((item) => item.answer === 'ich').length;
  const value = total ? Math.round((ich / total) * 100) : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dein Mental Load im Alltag</Text>
      <Text style={styles.text}>Du hast deine Sicht eingebracht.</Text>
      <Text style={styles.text}>Mental Load bedeutet, an Dinge zu denken, voraus zu planen und den Überblick zu behalten.</Text>
      <Text style={styles.text}>Dein Ergebnis basiert aktuell nur auf deinen Antworten.</Text>
      <View style={styles.barWrap}>
        <View style={[styles.bar, { width: `${value}%` }]} />
      </View>
      <Text style={styles.label}>Dein Anteil am Mitdenken im Alltag: {value}%</Text>
      {isPartner ? (
        <Pressable
          style={styles.cta}
          onPress={() => {
            submitPartnerResult();
            Alert.alert('Absenden', 'Dein Ergebnis wurde abgesendet. Eine Benachrichtigung wurde per E-Mail ausgelöst.');
            router.replace('/startseite' as never);
          }}
        >
          <Text style={styles.ctaText}>Absenden</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.cta} onPress={() => router.push('/partner-einladen' as never)}>
          <Text style={styles.ctaText}>Partner einladen</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 10 },
  title: { fontSize: 30, fontWeight: '700' },
  text: { color: '#334155' },
  barWrap: { height: 16, backgroundColor: '#e2e8f0', borderRadius: 999, overflow: 'hidden', marginTop: 8 },
  bar: { height: 16, backgroundColor: '#2563eb' },
  label: { fontWeight: '600', marginTop: 2 },
  cta: { marginTop: 'auto', backgroundColor: '#2563eb', borderRadius: 10, padding: 14 },
  ctaText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
