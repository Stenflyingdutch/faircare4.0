import { Redirect } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
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

const SWIPE_THRESHOLD = 110;

export default function KartenScreen() {
  const { user } = useAuth();
  const [cards, setCards] = useState<TaskCardListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isDeciding, setIsDeciding] = useState(false);
  const pan = useRef(new Animated.ValueXY()).current;
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

  const animateToNextCard = useCallback(() => {
    pan.setValue({ x: 0, y: 0 });
    setActiveCardIndex((current) => current + 1);
  }, [pan]);

  const handleCardDecision = useCallback(
    async (direction: 'left' | 'right' | 'up') => {
      if (!user) {
        return;
      }

      const activeCard = cards[activeCardIndex];
      if (!activeCard || isDeciding) {
        return;
      }

      setIsDeciding(true);
      try {
        if (direction === 'right') {
          await updateTaskCardDecision(activeCard.taskCardId, {
            suggestedOwner: user.uid,
            decisionStatus: 'owner_me',
          });
          setStatus('Du übernimmst die Aufgabe.');
        } else if (direction === 'left') {
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

        setCards((currentCards) =>
          currentCards.map((card) => {
            if (card.taskCardId !== activeCard.taskCardId) {
              return card;
            }

            if (direction === 'right') {
              return { ...card, suggestedOwner: user.uid };
            }

            if (direction === 'left' && partnerId) {
              return { ...card, suggestedOwner: partnerId };
            }

            return card;
          }),
        );

        animateToNextCard();
      } catch (error) {
        setStatus(`Fehler beim Swipen: ${getGermanFirebaseError(error)}`);
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      } finally {
        setIsDeciding(false);
      }
    },
    [activeCardIndex, animateToNextCard, cards, isDeciding, pan, partnerId, user],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 8 || Math.abs(gestureState.dy) > 8,
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > SWIPE_THRESHOLD) {
            Animated.timing(pan, {
              toValue: { x: width, y: gestureState.dy },
              duration: 180,
              useNativeDriver: false,
            }).start(() => {
              handleCardDecision('right');
            });
            return;
          }

          if (gestureState.dx < -SWIPE_THRESHOLD) {
            Animated.timing(pan, {
              toValue: { x: -width, y: gestureState.dy },
              duration: 180,
              useNativeDriver: false,
            }).start(() => {
              handleCardDecision('left');
            });
            return;
          }

          if (gestureState.dy < -SWIPE_THRESHOLD) {
            Animated.timing(pan, {
              toValue: { x: gestureState.dx, y: -width },
              duration: 180,
              useNativeDriver: false,
            }).start(() => {
              handleCardDecision('up');
            });
            return;
          }

          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 6,
            useNativeDriver: false,
          }).start();
        },
      }),
    [handleCardDecision, pan, width],
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
      <Text style={styles.subtitle}>Swipe wie bei Tinder: rechts = ich, links = Partner, oben = Diskussion.</Text>

      <Pressable style={styles.generateButton} onPress={handleGenerateCards}>
        <Text style={styles.buttonText}>Karten aus Ergebnissen erzeugen</Text>
      </Pressable>

      <Pressable style={styles.reloadButton} onPress={loadCards}>
        <Text style={styles.buttonText}>Karten neu laden</Text>
      </Pressable>

      <Text style={styles.statusText}>{status}</Text>
      {isLoading && <Text style={styles.infoText}>Lade ...</Text>}

      {activeCard ? (
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.card,
            {
              width: width - 40,
              transform: [{ translateX: pan.x }, { translateY: pan.y }],
            },
          ]}
        >
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
        </Animated.View>
      ) : (
        <View style={[styles.card, { width: width - 40 }]}>
          <Text style={styles.cardTitle}>Keine weiteren Karten</Text>
          <Text style={styles.cardDescription}>Erzeuge neue Karten oder lade Karten erneut aus Firestore.</Text>
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
    alignItems: 'center',
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
    width: '100%',
  },
  reloadButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    width: '100%',
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
});
