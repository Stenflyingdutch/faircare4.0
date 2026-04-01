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
  ensureInitialTaskCardsForCurrentFamily,
  loadTaskCardsByFamilyId,
  restoreTaskCard,
  storePostAssignmentResult,
  updateTaskCardOwnership,
} from '@/services/taskCardService';

type TaskCardListItem = Awaited<ReturnType<typeof loadTaskCardsByFamilyId>>[number];

type ActionType = 'take_me' | 'take_partner' | 'discard' | 'later' | 'reopen';

export default function KartenScreen() {
  const { user } = useAuth();
  const [cards, setCards] = useState<TaskCardListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadCards = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsLoading(true);
    setStatus('Karten werden geladen ...');

    try {
      const currentFamilyId = await getCurrentUserFamilyId(user.uid);
      setFamilyId(currentFamilyId);

      if (!currentFamilyId) {
        setCards([]);
        setStatus('Kein Familienkonto gefunden.');
        return;
      }

      await ensureInitialTaskCardsForCurrentFamily(user.uid);

      const familySnapshot = await getDoc(doc(db, collectionNames.families, currentFamilyId));
      const memberIds = (familySnapshot.data()?.memberIds as string[] | undefined) ?? [];
      setPartnerId(memberIds.find((memberId) => memberId !== user.uid) ?? null);

      const loadedCards = await loadTaskCardsByFamilyId(currentFamilyId);
      setCards(loadedCards);

      const ownerIds = [...new Set(loadedCards.map((card) => card.suggestedOwner).filter(Boolean))] as string[];
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

  const groupedCards = useMemo(() => {
    const map = new Map<string, TaskCardListItem[]>();
    cards
      .filter((card) => card.relevanceStatus !== 'discarded')
      .forEach((card) => {
        const category = card.category ?? 'Unkategorisiert';
        const list = map.get(category) ?? [];
        list.push(card);
        map.set(category, list);
      });

    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'de-DE'));
  }, [cards]);

  const discardedCards = useMemo(
    () => cards.filter((card) => card.relevanceStatus === 'discarded'),
    [cards],
  );

  const fairnessMessage =
    'Ziel ist nicht 50:50, sondern eine Verteilung, die sich für beide fair anfühlt – unter Berücksichtigung von Arbeit, Stress, Gesundheit und weiteren Verantwortungen.';

  const calculateMentalLoadComparison = useCallback(() => {
    if (!user) {
      return null;
    }

    const activeCards = cards.filter((card) => card.relevanceStatus !== 'discarded');
    if (activeCards.length === 0) {
      return null;
    }

    const userIds = [user.uid, partnerId].filter(Boolean) as string[];

    const beforeCounts = userIds.reduce<Record<string, number>>((acc, userId) => {
      acc[userId] = cards.filter((card) => card.suggestedOwner === userId && card.relevanceStatus !== 'discarded').length;
      return acc;
    }, {});

    const afterCounts = userIds.reduce<Record<string, number>>((acc, userId) => {
      acc[userId] = cards.filter((card) => card.assignedTo === userId && card.ownershipStatus === 'assigned').length;
      return acc;
    }, {});

    const totalRelevant = activeCards.length;

    const beforePercentages = userIds.reduce<Record<string, number>>((acc, userId) => {
      acc[userId] = Math.round(((beforeCounts[userId] ?? 0) / totalRelevant) * 1000) / 10;
      return acc;
    }, {});

    const afterPercentages = userIds.reduce<Record<string, number>>((acc, userId) => {
      acc[userId] = Math.round(((afterCounts[userId] ?? 0) / totalRelevant) * 1000) / 10;
      return acc;
    }, {});

    return {
      beforePercentages,
      afterPercentages,
      assignedCardCounts: afterCounts,
      discardedCardCounts: discardedCards.length,
    };
  }, [cards, discardedCards.length, partnerId, user]);

  const persistComparison = useCallback(async () => {
    if (!familyId) {
      return;
    }

    const comparison = calculateMentalLoadComparison();
    if (!comparison) {
      return;
    }

    await storePostAssignmentResult({
      familyId,
      beforeAssignmentMentalLoad: comparison.beforePercentages,
      afterAssignmentMentalLoad: comparison.afterPercentages,
      assignedCardCounts: comparison.assignedCardCounts,
      discardedCardCounts: comparison.discardedCardCounts,
    });
  }, [calculateMentalLoadComparison, familyId]);

  const handleAction = useCallback(
    async (card: TaskCardListItem, actionType: ActionType) => {
      if (!user || isSaving) {
        return;
      }

      setIsSaving(true);
      try {
        if (actionType === 'take_me') {
          await updateTaskCardOwnership(card.taskCardId, {
            ownershipStatus: 'assigned',
            assignedTo: user.uid,
            suggestedOwner: user.uid,
          });
          setStatus('Karte dir zugewiesen.');
        } else if (actionType === 'take_partner') {
          if (!partnerId) {
            setStatus('Kein Partnerprofil gefunden.');
            return;
          }

          await updateTaskCardOwnership(card.taskCardId, {
            ownershipStatus: 'assigned',
            assignedTo: partnerId,
            suggestedOwner: partnerId,
          });
          setStatus('Karte Partner zugewiesen.');
        } else if (actionType === 'discard') {
          await updateTaskCardOwnership(card.taskCardId, {
            ownershipStatus: 'discarded',
            assignedTo: null,
            relevanceStatus: 'discarded',
          });
          setStatus('Karte als nicht relevant markiert.');
        } else if (actionType === 'later') {
          await updateTaskCardOwnership(card.taskCardId, {
            ownershipStatus: 'unassigned',
            assignedTo: null,
            relevanceStatus: 'active',
          });
          setStatus('Karte für spätere Besprechung offen gelassen.');
        } else {
          await restoreTaskCard(card.taskCardId);
          setStatus('Karte für Neuverhandlung wieder aktiviert.');
        }

        await loadCards();
        await persistComparison();
      } catch (error) {
        setStatus(`Fehler beim Aktualisieren: ${getGermanFirebaseError(error)}`);
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, loadCards, partnerId, persistComparison, user],
  );

  useFocusEffect(
    useCallback(() => {
      loadCards();
    }, [loadCards]),
  );

  if (!user) {
    return <Redirect href="/anmelden" />;
  }

  const comparison = calculateMentalLoadComparison();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Karten</Text>
      <Text style={styles.subtitle}>Mental Load und Care-Arbeit für 0–2 Jahre – pro Verantwortung eine Karte.</Text>
      <Text style={styles.fairnessInfo}>{fairnessMessage}</Text>

      <Pressable style={styles.reloadButton} onPress={loadCards}>
        <Text style={styles.buttonText}>Karten neu laden</Text>
      </Pressable>

      <Text style={styles.statusText}>{status}</Text>
      {isLoading && <Text style={styles.infoText}>Lade ...</Text>}

      {groupedCards.map(([category, categoryCards]) => (
        <View key={category} style={styles.categorySection}>
          <Text style={styles.categoryTitle}>{category}</Text>

          {categoryCards.map((card) => (
            <View key={card.taskCardId} style={styles.card}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardDescription}>{card.description}</Text>

              <Text style={styles.listTitle}>Daran denken</Text>
              {card.thinkingTasks?.map((task) => (
                <Text key={`${card.taskCardId}-think-${task}`} style={styles.listItem}>
                  • {task}
                </Text>
              ))}

              <Text style={styles.listTitle}>Machen</Text>
              {card.doingTasks?.map((task) => (
                <Text key={`${card.taskCardId}-do-${task}`} style={styles.listItem}>
                  • {task}
                </Text>
              ))}

              <Text style={styles.metaText}>
                Vorgeschlagene Zuständigkeit: {card.suggestedOwner ? ownerNames[card.suggestedOwner] ?? card.suggestedOwner : 'Offen'}
              </Text>
              <Text style={styles.metaText}>Status: {card.ownershipStatus}</Text>

              <View style={styles.actionsRow}>
                <Pressable style={[styles.actionButton, styles.meButton]} onPress={() => handleAction(card, 'take_me')}>
                  <Text style={styles.actionText}>Ich übernehme</Text>
                </Pressable>
                <Pressable style={[styles.actionButton, styles.partnerButton]} onPress={() => handleAction(card, 'take_partner')}>
                  <Text style={styles.actionText}>Partner übernimmt</Text>
                </Pressable>
              </View>
              <View style={styles.actionsRow}>
                <Pressable style={[styles.actionButton, styles.discardButton]} onPress={() => handleAction(card, 'discard')}>
                  <Text style={styles.actionText}>Nicht relevant</Text>
                </Pressable>
                <Pressable style={[styles.actionButton, styles.laterButton]} onPress={() => handleAction(card, 'later')}>
                  <Text style={styles.actionText}>Später besprechen</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ))}

      <View style={styles.categorySection}>
        <Text style={styles.categoryTitle}>Wöchentlicher Check-in: Neu verhandeln</Text>
        <Text style={styles.infoText}>Bereits zugewiesene Karten können hier wieder geöffnet werden.</Text>
        {cards
          .filter((card) => card.ownershipStatus === 'assigned' && card.relevanceStatus !== 'discarded')
          .map((card) => (
            <View key={`assigned-${card.taskCardId}`} style={styles.checkinCard}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.metaText}>
                Aktuell zuständig: {card.assignedTo ? ownerNames[card.assignedTo] ?? card.assignedTo : 'Offen'}
              </Text>
              <Pressable style={[styles.actionButton, styles.laterButton]} onPress={() => handleAction(card, 'reopen')}>
                <Text style={styles.actionText}>Im Check-in neu verhandeln</Text>
              </Pressable>
            </View>
          ))}
      </View>

      <View style={styles.categorySection}>
        <Text style={styles.categoryTitle}>Nicht relevant</Text>
        {discardedCards.length === 0 && <Text style={styles.infoText}>Keine verworfenen Karten.</Text>}
        {discardedCards.map((card) => (
          <View key={`discarded-${card.taskCardId}`} style={styles.checkinCard}>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardDescription}>{card.description}</Text>
            <Pressable style={[styles.actionButton, styles.meButton]} onPress={() => handleAction(card, 'reopen')}>
              <Text style={styles.actionText}>Wieder aktivieren</Text>
            </Pressable>
          </View>
        ))}
      </View>

      {comparison && (
        <View style={styles.categorySection}>
          <Text style={styles.categoryTitle}>Schätzung: Mental Load vor/nach Zuordnung</Text>
          {Object.entries(comparison.beforePercentages).map(([userId, value]) => (
            <Text key={`before-${userId}`} style={styles.metaText}>
              Vorher {ownerNames[userId] ?? userId}: {value}%
            </Text>
          ))}
          {Object.entries(comparison.afterPercentages).map(([userId, value]) => (
            <Text key={`after-${userId}`} style={styles.metaText}>
              Nachher {ownerNames[userId] ?? userId}: {value}%
            </Text>
          ))}
          <Text style={styles.infoText}>{fairnessMessage}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
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
  fairnessInfo: {
    textAlign: 'center',
    color: '#1d4ed8',
    fontWeight: '600',
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
  },
  categorySection: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    backgroundColor: '#f1f5f9',
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 4,
  },
  checkinCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
    padding: 10,
    gap: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardDescription: {
    color: '#334155',
  },
  listTitle: {
    marginTop: 6,
    fontWeight: '700',
    color: '#1e293b',
  },
  listItem: {
    color: '#334155',
  },
  metaText: {
    color: '#334155',
    fontWeight: '600',
  },
  actionsRow: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  meButton: {
    backgroundColor: '#0f766e',
  },
  partnerButton: {
    backgroundColor: '#4f46e5',
  },
  discardButton: {
    backgroundColor: '#dc2626',
  },
  laterButton: {
    backgroundColor: '#f59e0b',
  },
  actionText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 12,
  },
});
