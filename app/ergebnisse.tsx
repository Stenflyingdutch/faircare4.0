import { Redirect } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { SectionBlock } from '@/components/ui/SectionBlock';
import { SoftButton } from '@/components/ui/SoftButton';
import { useAuth } from '@/contexts/AuthContext';
import { buildAndStoreFamilyResults } from '@/services/resultsService';
import { theme } from '@/lib/theme';

type ErgebnisState = Awaited<ReturnType<typeof buildAndStoreFamilyResults>>;

function getConflictStyle(score: number) {
  if (score >= 1.7) {
    return { label: 'Hier gibt es Unterschiede', tone: 'conflict' as const };
  }

  if (score >= 1.1) {
    return { label: 'Gemeinsam anschauen', tone: 'default' as const };
  }

  return { label: 'Wirkt stimmig', tone: 'accent' as const };
}

export default function ErgebnisseScreen() {
  const { user } = useAuth();
  const [result, setResult] = useState<ErgebnisState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadResults = async () => {
    if (!user) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextResult = await buildAndStoreFamilyResults(user.uid);
      setResult(nextResult);
    } catch (loadError) {
      if (loadError instanceof FirebaseError && loadError.code === 'invalid-argument') {
        setError('Für diese Ansicht fehlen noch Antworten von beiden Elternteilen.');
      } else {
        setError('Verbindung gerade nicht verfügbar. Bitte später erneut versuchen.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, [user]);

  const scoreCards = useMemo(() => {
    if (!result) {
      return [];
    }

    return result.parentProfiles.map((profile) => {
      const userScores = result.scoresPerUser[profile.userId];
      return {
        ...profile,
        ...userScores,
      };
    });
  }, [result]);

  if (!user) {
    return <Redirect href="/anmelden" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Ergebnisse</Text>
      <Text style={styles.subtitle}>Die Verteilung wirkt aktuell unausgeglichen oder stimmig – wir schauen gemeinsam darauf.</Text>

      <SoftButton label="Gemeinsam anschauen" onPress={loadResults} />

      {isLoading ? <Text style={styles.infoText}>Ergebnisse werden berechnet ...</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {!isLoading && result ? (
        <>
          <SectionBlock title="Scores je Elternteil">
            {scoreCards.map((card) => (
              <PremiumCard key={card.userId}>
                <Text style={styles.cardTitle}>{card.displayName}</Text>
                <Text style={styles.cardText}>Task Load: {card.taskLoadScore}%</Text>
                <Text style={styles.cardText}>Mental Load: {card.mentalLoadScore}%</Text>
                <Text style={styles.cardText}>Zufriedenheit: {card.satisfactionScore}%</Text>
              </PremiumCard>
            ))}
          </SectionBlock>

          <SectionBlock title="Gute Gesprächsstarts" subtitle="Diese Punkte können helfen, ruhig weiterzusprechen.">
            {result.conflictQuestions.slice(0, 8).map((item) => {
              const conflictState = getConflictStyle(item.conflictScore);
              return (
                <PremiumCard key={item.questionId} style={styles.conflictCard}>
                  <Badge label={conflictState.label} tone={conflictState.tone} />
                  <Text style={styles.cardTitle}>{item.category}</Text>
                  <Text style={styles.cardText}>{item.prompt}</Text>
                  <Text style={styles.metaText}>Konflikt-Score: {item.conflictScore}</Text>
                </PremiumCard>
              );
            })}
          </SectionBlock>

          <SectionBlock title="Top Kategorien" subtitle="Hier lohnt sich ein späteres Check-in.">
            {result.topConflictCategories.map((category) => (
              <PremiumCard key={category.category}>
                <Text style={styles.cardTitle}>{category.category}</Text>
                <Text style={styles.metaText}>Durchschnitt: {category.score}</Text>
              </PremiumCard>
            ))}
          </SectionBlock>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    gap: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.title,
    fontWeight: '700',
    textAlign: 'center',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: theme.typography.lineHeightBody,
    color: theme.colors.textSecondary,
  },
  infoText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  errorText: {
    textAlign: 'center',
    color: '#A35B56',
    lineHeight: 22,
  },
  conflictCard: {
    borderColor: '#F8E3E0',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  cardText: {
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  metaText: {
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
});
