import { Redirect } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getGermanFirebaseError } from '@/lib/firebaseError';
import { buildAndStoreFamilyResults } from '@/services/resultsService';

type ErgebnisState = Awaited<ReturnType<typeof buildAndStoreFamilyResults>>;

function getConflictStyle(score: number) {
  if (score >= 1.7) {
    return { label: 'Hoch', color: '#b91c1c', backgroundColor: '#fee2e2' };
  }

  if (score >= 1.1) {
    return { label: 'Mittel', color: '#b45309', backgroundColor: '#fef3c7' };
  }

  return { label: 'Niedrig', color: '#166534', backgroundColor: '#dcfce7' };
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
      setError(getGermanFirebaseError(loadError));
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
      <Text style={styles.subtitle}>Vergleich der Quiz-Antworten beider Elternteile mit Fokus auf Zufriedenheit.</Text>

      <Pressable style={styles.reloadButton} onPress={loadResults}>
        <Text style={styles.reloadButtonText}>Neu berechnen</Text>
      </Pressable>

      {isLoading && <Text style={styles.infoText}>Ergebnisse werden berechnet ...</Text>}
      {error && <Text style={styles.errorText}>Fehler: {error}</Text>}

      {!isLoading && result && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scores je Elternteil</Text>
            {scoreCards.map((card) => (
              <View key={card.userId} style={styles.card}>
                <Text style={styles.cardTitle}>{card.displayName}</Text>
                <Text style={styles.cardText}>Task Load: {card.taskLoadScore}%</Text>
                <Text style={styles.cardText}>Mental Load: {card.mentalLoadScore}%</Text>
                <Text style={styles.cardText}>Zufriedenheit: {card.satisfactionScore}%</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Größte Konflikte (nach Priorität)</Text>
            {result.conflictQuestions.slice(0, 8).map((item) => {
              const conflictState = getConflictStyle(item.conflictScore);
              const isHighMismatch = item.mismatchScore >= 1.5;
              const isLowSatisfaction = item.dissatisfactionScore >= 0.75;

              return (
                <View
                  key={item.questionId}
                  style={[styles.listItem, { backgroundColor: conflictState.backgroundColor, borderColor: conflictState.color }]}
                >
                  <Text style={[styles.listPrimary, { color: conflictState.color }]}>[{conflictState.label}] {item.category}</Text>
                  <Text style={styles.listQuestion}>{item.prompt}</Text>
                  <Text style={styles.listSecondary}>Konflikt-Score: {item.conflictScore}</Text>
                  <Text style={styles.listSecondary}>Mismatch-Score: {item.mismatchScore}</Text>
                  <Text style={styles.listSecondary}>Unzufriedenheits-Score: {item.dissatisfactionScore}</Text>
                  {isHighMismatch && <Text style={styles.warningText}>⚠️ Hoher Mismatch bei Aufgaben-/Mental-Load</Text>}
                  {isLowSatisfaction && <Text style={styles.warningText}>⚠️ Niedrige Zufriedenheit</Text>}
                </View>
              );
            })}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Konflikt-Kategorien</Text>
            {result.topConflictCategories.map((category) => (
              <View key={category.category} style={styles.listItem}>
                <Text style={styles.listPrimary}>{category.category}</Text>
                <Text style={styles.listSecondary}>Durchschnittlicher Konflikt-Score: {category.score}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
    color: '#0f172a',
  },
  subtitle: {
    textAlign: 'center',
    color: '#334155',
  },
  reloadButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
  },
  reloadButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '700',
  },
  infoText: {
    textAlign: 'center',
    color: '#1d4ed8',
  },
  errorText: {
    color: '#b91c1c',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  card: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    padding: 10,
  },
  cardTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  cardText: {
    color: '#1e293b',
  },
  listItem: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#ffffff',
    gap: 2,
  },
  listPrimary: {
    fontWeight: '700',
    color: '#0f172a',
  },
  listQuestion: {
    color: '#0f172a',
    fontWeight: '500',
  },
  listSecondary: {
    color: '#475569',
  },
  warningText: {
    color: '#b91c1c',
    fontWeight: '600',
  },
});
