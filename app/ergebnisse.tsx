import { Redirect } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getGermanFirebaseError } from '@/lib/firebaseError';
import { buildAndStoreFamilyResults } from '@/services/resultsService';

type ErgebnisState = Awaited<ReturnType<typeof buildAndStoreFamilyResults>>;

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
      <Text style={styles.subtitle}>Vergleich der Quiz-Antworten beider Elternteile.</Text>

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
                <Text style={styles.cardText}>Verantwortung: {card.responsibilityScore}%</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Größte Unterschiede</Text>
            {result.mismatchQuestions.slice(0, 5).map((item) => (
              <View key={item.questionId} style={styles.listItem}>
                <Text style={styles.listPrimary}>
                  {item.category}: {item.prompt}
                </Text>
                <Text style={styles.listSecondary}>Mismatch-Score: {item.mismatchScore}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top 5 Konfliktbereiche</Text>
            {result.topConflictCategories.map((category) => (
              <View key={category.category} style={styles.listItem}>
                <Text style={styles.listPrimary}>{category.category}</Text>
                <Text style={styles.listSecondary}>Konflikt-Score: {category.score}</Text>
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
  },
  listPrimary: {
    fontWeight: '600',
    color: '#0f172a',
  },
  listSecondary: {
    color: '#475569',
  },
});
