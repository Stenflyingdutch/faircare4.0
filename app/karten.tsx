import { Redirect } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { getGermanFirebaseError } from '@/lib/firebaseError';
import { collectionNames, getCurrentUserFamilyId } from '@/services/familyService';
import { generateTaskCardsFromLatestResult, loadTaskCardsByFamilyId } from '@/services/taskCardService';

type TaskCardListItem = Awaited<ReturnType<typeof loadTaskCardsByFamilyId>>[number];

export default function KartenScreen() {
  const { user } = useAuth();
  const [cards, setCards] = useState<TaskCardListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const { width } = useWindowDimensions();

  const loadCards = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsLoading(true);
    setStatus('Karten werden geladen ...');

    try {
      const familyId = await getCurrentUserFamilyId(user.uid);

      if (!familyId) {
        setCards([]);
        setStatus('Kein Familienkonto gefunden.');
        return;
      }

      const loadedCards = await loadTaskCardsByFamilyId(familyId);
      setCards(loadedCards);

      const ownerIds = [...new Set(loadedCards.map((card) => card.suggestedOwner).filter(Boolean))];
      const ownerEntries = await Promise.all(
        ownerIds.map(async (ownerId) => {
          const ownerSnapshot = await getDoc(doc(db, collectionNames.users, ownerId));
          const ownerData = ownerSnapshot.data();
          const name =
            (ownerData?.displayName as string | undefined) ??
            (ownerData?.email as string | undefined) ??
            'Unbekanntes Elternteil';
          return [ownerId, name] as const;
        }),
      );
      setOwnerNames(Object.fromEntries(ownerEntries));

      setStatus(loadedCards.length > 0 ? 'Karten erfolgreich geladen.' : 'Noch keine Karten vorhanden.');
    } catch (error) {
      setStatus(`Fehler beim Laden: ${getGermanFirebaseError(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleGenerateCards = async () => {
    if (!user) {
      return;
    }

    setStatus('Karten werden aus dem neuesten Ergebnis erstellt ...');

    try {
      const outcome = await generateTaskCardsFromLatestResult(user.uid);
      setStatus(`${outcome.createdCount} Karten wurden erstellt.`);
      await loadCards();
    } catch (error) {
      setStatus(`Fehler beim Erstellen: ${getGermanFirebaseError(error)}`);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCards();
    }, [loadCards]),
  );

  const visibleCards = useMemo(() => cards.filter((card) => Boolean(card.title)), [cards]);

  if (!user) {
    return <Redirect href="/anmelden" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Karten</Text>
      <Text style={styles.subtitle}>Aufgabenkarten aus den größten Unterschieden eurer letzten Ergebnisse.</Text>

      <Pressable style={styles.generateButton} onPress={handleGenerateCards}>
        <Text style={styles.buttonText}>Karten aus Ergebnissen erzeugen</Text>
      </Pressable>

      <Pressable style={styles.reloadButton} onPress={loadCards}>
        <Text style={styles.buttonText}>Karten neu laden</Text>
      </Pressable>

      <Text style={styles.statusText}>{status}</Text>
      {isLoading && <Text style={styles.infoText}>Lade ...</Text>}

      {visibleCards.length > 0 && (
        <Text style={styles.swipeHint}>Tipp: Wische nach links oder rechts, um zwischen Karten zu wechseln.</Text>
      )}

      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
        {visibleCards.map((card) => (
          <View key={card.taskCardId} style={[styles.card, { width: width - 40 }]}>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardMeta}>Kategorie: {card.category}</Text>
            <Text style={styles.cardDescription}>{card.description}</Text>
            <Text style={styles.cardMeta}>Häufigkeit: {card.frequency}</Text>
            <Text style={styles.cardMeta}>Vorgeschlagene Person: {ownerNames[card.suggestedOwner] ?? card.suggestedOwner}</Text>

            <Text style={styles.hiddenTitle}>Versteckte Verantwortungen:</Text>
            {card.hiddenResponsibilities?.map((responsibility) => (
              <Text key={`${card.taskCardId}-${responsibility}`} style={styles.hiddenItem}>
                • {responsibility}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
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
  generateButton: {
    backgroundColor: '#0f766e',
    borderRadius: 8,
    paddingVertical: 10,
  },
  reloadButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
  },
  buttonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '700',
  },
  statusText: {
    color: '#1e293b',
    textAlign: 'center',
    fontWeight: '600',
  },
  infoText: {
    color: '#475569',
    textAlign: 'center',
  },
  swipeHint: {
    color: '#475569',
    textAlign: 'center',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardMeta: {
    color: '#334155',
    fontWeight: '600',
  },
  cardDescription: {
    color: '#1e293b',
  },
  hiddenTitle: {
    marginTop: 4,
    fontWeight: '700',
    color: '#0f172a',
  },
  hiddenItem: {
    color: '#475569',
  },
});
