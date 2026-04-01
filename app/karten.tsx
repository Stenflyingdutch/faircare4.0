import { Redirect } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { getGermanFirebaseError } from '@/lib/firebaseError';
import { collectionNames, getCurrentUserFamilyId } from '@/services/familyService';
import {
  generateTaskCardsFromLatestResult,
  loadTaskCardsByFamilyId,
  updateTaskCardDecision,
} from '@/services/taskCardService';

type TaskCardListItem = Awaited<ReturnType<typeof loadTaskCardsByFamilyId>>[number];
type DecisionTarget = 'partner' | 'discussion' | 'me';

export default function KartenScreen() {
  const { user } = useAuth();
  const [cards, setCards] = useState<TaskCardListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isDeciding, setIsDeciding] = useState(false);

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

      const familySnapshot = await getDoc(doc(db, collectionNames.families, familyId));
      const memberIds = (familySnapshot.data()?.memberIds as string[] | undefined) ?? [];
      setPartnerId(memberIds.find((memberId) => memberId !== user.uid) ?? null);

      const loadedCards = await loadTaskCardsByFamilyId(familyId);
      setCards(loadedCards);
      setActiveCardIndex(0);

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

  const handleCardDecision = useCallback(
    async (target: DecisionTarget) => {
      if (!user || isDeciding) {
        return;
      }

      const activeCard = cards[activeCardIndex];
      if (!activeCard) {
        return;
      }

      setIsDeciding(true);
      try {
        if (target === 'me') {
          await updateTaskCardDecision(activeCard.taskCardId, {
            suggestedOwner: user.uid,
            decisionStatus: 'owner_me',
          });
          setStatus('Du übernimmst die Aufgabe.');
        } else if (target === 'partner') {
          if (!partnerId) {
            setStatus('Kein Partnerprofil gefunden. Bitte Familie prüfen.');
            return;
          }

          await updateTaskCardDecision(activeCard.taskCardId, {
            suggestedOwner: partnerId,
            decisionStatus: 'owner_partner',
          });
          setStatus('Partner übernimmt die Aufgabe.');
        } else {
          await updateTaskCardDecision(activeCard.taskCardId, {
            decisionStatus: 'discussion',
          });
          setStatus('Zur Diskussion markiert.');
        }

        setActiveCardIndex((current) => current + 1);
      } catch (error) {
        setStatus(`Fehler beim Zuordnen: ${getGermanFirebaseError(error)}`);
      } finally {
        setIsDeciding(false);
      }
    },
    [activeCardIndex, cards, isDeciding, partnerId, user],
  );

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
  const activeCard = visibleCards[activeCardIndex] ?? null;

  if (!user) {
    return <Redirect href="/anmelden" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Karten</Text>
      <Text style={styles.subtitle}>Zuordnung per Klick: Partner, Diskussion oder Ich.</Text>

      <Pressable style={styles.generateButton} onPress={handleGenerateCards}>
        <Text style={styles.buttonText}>Karten aus Ergebnissen erzeugen</Text>
      </Pressable>

      <Pressable style={styles.reloadButton} onPress={loadCards}>
        <Text style={styles.buttonText}>Karten neu laden</Text>
      </Pressable>

      <Text style={styles.statusText}>{status}</Text>
      {isLoading && <Text style={styles.infoText}>Lade ...</Text>}

      {activeCard ? (
        <View style={styles.card}>
          <Text style={styles.cardCounter}>
            Karte {activeCardIndex + 1} von {visibleCards.length}
          </Text>
          <Text style={styles.cardTitle}>{activeCard.title}</Text>
          <Text style={styles.cardMeta}>Kategorie: {activeCard.category}</Text>
          <Text style={styles.cardDescription}>{activeCard.description}</Text>
          <Text style={styles.cardMeta}>Häufigkeit: {activeCard.frequency}</Text>
          <Text style={styles.cardMeta}>
            Vorgeschlagene Person: {ownerNames[activeCard.suggestedOwner] ?? activeCard.suggestedOwner}
          </Text>

          <Text style={styles.hiddenTitle}>Versteckte Verantwortungen:</Text>
          {activeCard.hiddenResponsibilities?.map((responsibility) => (
            <Text key={`${activeCard.taskCardId}-${responsibility}`} style={styles.hiddenItem}>
              • {responsibility}
            </Text>
          ))}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Keine weiteren Karten</Text>
          <Text style={styles.cardDescription}>Erzeuge neue Karten oder lade Karten erneut aus Firestore.</Text>
        </View>
      )}

      {activeCard && (
        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.actionButton, styles.partnerButton]}
            onPress={() => handleCardDecision('partner')}
            disabled={isDeciding}
          >
            <Text style={styles.actionText}>Partner</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.discussionButton]}
            onPress={() => handleCardDecision('discussion')}
            disabled={isDeciding}
          >
            <Text style={styles.actionText}>Diskussion</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.meButton]}
            onPress={() => handleCardDecision('me')}
            disabled={isDeciding}
          >
            <Text style={styles.actionText}>Ich</Text>
          </Pressable>
        </View>
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 4,
  },
  cardCounter: {
    color: '#64748b',
    fontWeight: '600',
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
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
  },
  partnerButton: {
    backgroundColor: '#ea580c',
  },
  discussionButton: {
    backgroundColor: '#7c3aed',
  },
  meButton: {
    backgroundColor: '#059669',
  },
  actionText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '700',
  },
});
