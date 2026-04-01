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
  type LayoutChangeEvent,
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
type DropTarget = 'partner' | 'discussion' | 'me';
type DropZone = { x: number; y: number; width: number; height: number };

export default function KartenScreen() {
  const { user } = useAuth();
  const [cards, setCards] = useState<TaskCardListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isDeciding, setIsDeciding] = useState(false);
  const [dropZones, setDropZones] = useState<Partial<Record<DropTarget, DropZone>>>({});
  const pan = useRef(new Animated.ValueXY()).current;
  const dropZoneRefs = useRef<Partial<Record<DropTarget, View | null>>>({});
  const { width } = useWindowDimensions();

  const setDropZone = (target: DropTarget, event: LayoutChangeEvent) => {
    event.persist();
    requestAnimationFrame(() => {
      dropZoneRefs.current[target]?.measureInWindow((x, y, zoneWidth, zoneHeight) => {
        setDropZones((current) => ({
          ...current,
          [target]: { x, y, width: zoneWidth, height: zoneHeight },
        }));
      });
    });
  };

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
    async (target: DropTarget) => {
      if (!user) {
        return;
      }

      const activeCard = cards[activeCardIndex];
      if (!activeCard || isDeciding) {
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

        animateToNextCard();
      } catch (error) {
        setStatus(`Fehler beim Zuordnen: ${getGermanFirebaseError(error)}`);
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

  const findDropTarget = useCallback(
    (x: number, y: number): DropTarget | null => {
      const zones = dropZones as Record<string, DropZone>;
      const targets: DropTarget[] = ['partner', 'discussion', 'me'];

      for (const target of targets) {
        const zone = zones[target];
        if (!zone) {
          continue;
        }

        const withinX = x >= zone.x && x <= zone.x + zone.width;
        const withinY = y >= zone.y && y <= zone.y + zone.height;

        if (withinX && withinY) {
          return target;
        }
      }

      return null;
    },
    [dropZones],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_, gestureState) => {
          const target = findDropTarget(gestureState.moveX, gestureState.moveY);

          if (!target) {
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              friction: 6,
              useNativeDriver: false,
            }).start();
            return;
          }

          handleCardDecision(target);
        },
      }),
    [findDropTarget, handleCardDecision, pan],
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
    <ScrollView contentContainerStyle={styles.container} scrollEnabled={false}>
      <Text style={styles.title}>Karten</Text>
      <Text style={styles.subtitle}>Karte ziehen und in eine Box loslassen: Partner, Diskussion oder Ich.</Text>

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

      <View style={styles.dropZoneRow}>
        <View ref={(ref) => { dropZoneRefs.current.partner = ref; }} style={[styles.dropZone, styles.dropPartner]} onLayout={(event) => setDropZone('partner', event)}>
          <Text style={styles.dropZoneText}>Partner</Text>
        </View>
        <View ref={(ref) => { dropZoneRefs.current.discussion = ref; }} style={[styles.dropZone, styles.dropDiscussion]} onLayout={(event) => setDropZone('discussion', event)}>
          <Text style={styles.dropZoneText}>Diskussion</Text>
        </View>
        <View ref={(ref) => { dropZoneRefs.current.me = ref; }} style={[styles.dropZone, styles.dropMe]} onLayout={(event) => setDropZone('me', event)}>
          <Text style={styles.dropZoneText}>Ich</Text>
        </View>
      </View>
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
  dropZoneRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  dropZone: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 2,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dropPartner: {
    borderColor: '#ea580c',
    backgroundColor: '#ffedd5',
  },
  dropDiscussion: {
    borderColor: '#7c3aed',
    backgroundColor: '#f3e8ff',
  },
  dropMe: {
    borderColor: '#059669',
    backgroundColor: '#d1fae5',
  },
  dropZoneText: {
    fontWeight: '700',
    color: '#0f172a',
  },
});
