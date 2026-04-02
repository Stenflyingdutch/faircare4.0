import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';
import { loadMentalLoadAnswers } from '@/services/mentalLoadPersistenceService';

export default function EigenesErgebnisScreen() {
  const { user } = useAuth();
  const { initiatorResult, partnerResult, session, hydrateAnswers } = useMentalLoadFlow();
  const params = useLocalSearchParams<{ mode?: string }>();

  const isInitiatorByEmail = session.initiatorUser?.email?.toLowerCase() === user?.email?.toLowerCase();
  const isPartnerByEmail = session.partnerUser?.email?.toLowerCase() === user?.email?.toLowerCase();

  const inferredMode = params.mode === 'partner'
    ? 'partner'
    : params.mode === 'initiator'
      ? 'initiator'
      : isPartnerByEmail
        ? 'partner'
        : isInitiatorByEmail
          ? 'initiator'
          : session.anonymousQuizSession.partnerAnswers.length > session.anonymousQuizSession.initiatorAnswers.length
            ? 'partner'
            : 'initiator';

  const isPartner = inferredMode === 'partner';
  const result = isPartner ? partnerResult : initiatorResult;

  useEffect(() => {
    const shouldLoad =
      Boolean(user?.uid) &&
      session.anonymousQuizSession.initiatorAnswers.length === 0 &&
      session.anonymousQuizSession.partnerAnswers.length === 0;

    if (!shouldLoad || !user?.uid) {
      return;
    }

    loadMentalLoadAnswers(user.uid).then((persisted) => {
      if (persisted.initiatorAnswers.length > 0) {
        hydrateAnswers('initiator', persisted.initiatorAnswers, persisted.initiatorQuizCompleted);
      }
      if (persisted.partnerAnswers.length > 0) {
        hydrateAnswers('partner', persisted.partnerAnswers, persisted.partnerQuizCompleted);
      }
    });
  }, [hydrateAnswers, session.anonymousQuizSession.initiatorAnswers.length, session.anonymousQuizSession.partnerAnswers.length, user?.uid]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Dein Mental Load im Alltag</Text>
      <Text style={styles.text}>Du hast deine Sicht eingebracht.</Text>
      <Text style={styles.text}>Mental Load bedeutet, an Dinge zu denken, voraus zu planen und den Überblick zu behalten. Auch dann, wenn nichts aktiv erledigt wird.</Text>
      <Text style={styles.text}>In deinem Alltag zeigt sich das so:</Text>
      {result.summaryBullets.map((bullet) => (
        <Text style={styles.bullet} key={bullet}>• {bullet}</Text>
      ))}
      {result.summaryBullets.length === 0 && (
        <Text style={styles.text}>Es sind aktuell keine lokal gespeicherten Detailantworten verfügbar. Starte das Quiz erneut, um die Detailauswertung zu aktualisieren.</Text>
      )}
      <Text style={styles.text}>Dein Ergebnis basiert aktuell nur auf deinen Antworten.</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dein Anteil am Mitdenken im Alltag</Text>
        <View style={styles.barWrap}>
          <View style={[styles.bar, { width: `${result.totalScore}%` }]} />
        </View>
        <Text style={styles.label}>{result.totalScore}%</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kategorien</Text>
        {result.categoryScores.map((item) => (
          <View key={item.category} style={styles.categoryCard}>
            <Text style={styles.categoryTitle}>{item.category}</Text>
            <Text style={styles.text}>Score: {item.score}%</Text>
            {item.highStress && <Text style={styles.warning}>Stresshinweis: In diesem Bereich wurde häufiger hoher Stress angegeben.</Text>}
          </View>
        ))}
      </View>

      <Text style={styles.text}>Dein Ergebnis basiert aktuell nur auf deiner eigenen Sicht. Erst mit der Sicht deines Partners entsteht das gemeinsame Bild.</Text>
      <Pressable style={styles.cta} onPress={() => router.replace((isPartner ? '/startseite' : '/partner-einladen') as never)}>
        <Text style={styles.ctaText}>{isPartner ? 'Zur Startseite' : 'Partner einladen'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 10 },
  title: { fontSize: 30, fontWeight: '700' },
  text: { color: '#334155' },
  bullet: { color: '#0f172a' },
  section: { marginTop: 8, gap: 8 },
  sectionTitle: { fontWeight: '700', fontSize: 18 },
  barWrap: { height: 16, backgroundColor: '#e2e8f0', borderRadius: 999, overflow: 'hidden' },
  bar: { height: 16, backgroundColor: '#2563eb' },
  label: { fontWeight: '700' },
  categoryCard: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, gap: 2 },
  categoryTitle: { fontWeight: '700' },
  warning: { color: '#b45309', fontWeight: '600' },
  cta: { marginTop: 8, backgroundColor: '#2563eb', borderRadius: 10, padding: 14 },
  ctaText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
