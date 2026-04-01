import { Redirect } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { getGermanFirebaseError } from '@/lib/firebaseError';
import { collectionNames, getCurrentUserFamilyId } from '@/services/familyService';
import {
  createTaskCardForFamily,
  ensureInitialTaskCardsForCurrentFamily,
  loadTaskCardsByFamilyId,
  restoreTaskCard,
  storePostAssignmentResult,
  updateTaskCardContent,
  updateTaskCardOwnership,
} from '@/services/taskCardService';

type TaskCardListItem = Awaited<ReturnType<typeof loadTaskCardsByFamilyId>>[number];

type ActionType = 'take_me' | 'take_partner' | 'discard' | 'reopen';
type OwnerFilterType = 'all' | 'user' | 'partner';

export default function KartenScreen() {
  const { user } = useAuth();
  const [cards, setCards] = useState<TaskCardListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilterType>('all');
  const [collapsedDiscarded, setCollapsedDiscarded] = useState(true);
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [expandedCardIds, setExpandedCardIds] = useState<string[]>([]);
  const [openCategoryMenuFor, setOpenCategoryMenuFor] = useState<string | null>(null);
  const [draftCard, setDraftCard] = useState({
    title: '',
    description: '',
    category: '',
    thinkingTasksText: '',
    doingTasksText: '',
  });
  const [newCard, setNewCard] = useState({
    title: '',
    description: '',
    category: '',
  });

  const knownCategories = useMemo(() => {
    const categories = new Set(
      cards.map((card) => card.category?.trim()).filter((category): category is string => Boolean(category)),
    );
    return [...categories].sort((a, b) => a.localeCompare(b, 'de-DE'));
  }, [cards]);

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
      .filter((card) => {
        if (card.relevanceStatus === 'discarded') {
          return false;
        }
        if (ownerFilter === 'user') {
          return card.suggestedOwner === user?.uid;
        }
        if (ownerFilter === 'partner') {
          return Boolean(partnerId) && card.suggestedOwner === partnerId;
        }
        return true;
      })
      .forEach((card) => {
        const category = card.category ?? 'Unkategorisiert';
        const list = map.get(category) ?? [];
        list.push(card);
        map.set(category, list);
      });

    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'de-DE'));
  }, [cards, ownerFilter, partnerId, user?.uid]);

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

  const startEditingCard = useCallback((card: TaskCardListItem) => {
    setEditingCardId(card.taskCardId);
    setDraftCard({
      title: card.title,
      description: card.description,
      category: card.category ?? '',
      thinkingTasksText: (card.thinkingTasks ?? []).join('\n'),
      doingTasksText: (card.doingTasks ?? []).join('\n'),
    });
  }, []);

  const toggleCardExpanded = useCallback((taskCardId: string) => {
    setExpandedCardIds((prev) =>
      prev.includes(taskCardId) ? prev.filter((value) => value !== taskCardId) : [...prev, taskCardId],
    );
  }, []);

  const cancelEditingCard = useCallback(() => {
    setEditingCardId(null);
    setDraftCard({
      title: '',
      description: '',
      category: '',
      thinkingTasksText: '',
      doingTasksText: '',
    });
  }, []);

  const saveEditedCard = useCallback(async () => {
    if (!editingCardId || isSaving) {
      return;
    }

    if (!draftCard.title.trim()) {
      setStatus('Bitte einen Titel für die Karte eingeben.');
      return;
    }

    setIsSaving(true);
    try {
      await updateTaskCardContent(editingCardId, {
        title: draftCard.title,
        description: draftCard.description,
        category: draftCard.category,
        thinkingTasks: draftCard.thinkingTasksText.split('\n'),
        doingTasks: draftCard.doingTasksText.split('\n'),
      });
      setStatus('Karte aktualisiert.');
      cancelEditingCard();
      await loadCards();
    } catch (error) {
      setStatus(`Fehler beim Speichern: ${getGermanFirebaseError(error)}`);
    } finally {
      setIsSaving(false);
    }
  }, [cancelEditingCard, draftCard, editingCardId, isSaving, loadCards]);

  const addNewCard = useCallback(async () => {
    if (!user || !familyId || isSaving) {
      return;
    }

    if (!newCard.title.trim()) {
      setStatus('Bitte einen Titel für die neue Aufgabe eingeben.');
      return;
    }

    setIsSaving(true);
    try {
      await createTaskCardForFamily(familyId, {
        title: newCard.title,
        description: newCard.description,
        category: newCard.category,
        suggestedOwner: user.uid,
      });
      setNewCard({ title: '', description: '', category: '' });
      setStatus('Neue Aufgabe hinzugefügt.');
      await loadCards();
    } catch (error) {
      setStatus(`Fehler beim Hinzufügen: ${getGermanFirebaseError(error)}`);
    } finally {
      setIsSaving(false);
    }
  }, [familyId, isSaving, loadCards, newCard, user]);

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

      <Text style={styles.statusText}>{status}</Text>
      {isLoading && <Text style={styles.infoText}>Lade ...</Text>}
      <Pressable style={[styles.actionButton, styles.meButton]} onPress={() => setShowNewCardForm((prev) => !prev)}>
        <Text style={styles.actionText}>{showNewCardForm ? 'Neue Karte schließen' : 'Neue Karte anlegen'}</Text>
      </Pressable>
      <View style={styles.filterRow}>
        <Pressable
          style={[styles.filterButton, ownerFilter === 'all' && styles.filterButtonActive]}
          onPress={() => setOwnerFilter('all')}
        >
          <Text style={[styles.filterButtonText, ownerFilter === 'all' && styles.filterButtonTextActive]}>Alle</Text>
        </Pressable>
        <Pressable
          style={[styles.filterButton, ownerFilter === 'user' && styles.filterButtonActive]}
          onPress={() => setOwnerFilter('user')}
        >
          <Text style={[styles.filterButtonText, ownerFilter === 'user' && styles.filterButtonTextActive]}>
            {ownerNames[user.uid] ?? user.uid}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterButton, ownerFilter === 'partner' && styles.filterButtonActive]}
          onPress={() => setOwnerFilter('partner')}
        >
          <Text style={[styles.filterButtonText, ownerFilter === 'partner' && styles.filterButtonTextActive]}>
            {(partnerId && ownerNames[partnerId]) ?? 'Partner'}
          </Text>
        </Pressable>
      </View>

      {groupedCards.map(([category, categoryCards]) => (
        <View key={category} style={styles.categorySection}>
          <Text style={styles.categoryTitle}>{category}</Text>

          {categoryCards.map((card) => (
            <View key={card.taskCardId} style={styles.card}>
              <Pressable style={styles.cardHeader} onPress={() => toggleCardExpanded(card.taskCardId)}>
                <Text style={styles.cardTitle}>{card.title}</Text>
              </Pressable>
              {expandedCardIds.includes(card.taskCardId) &&
                (editingCardId === card.taskCardId ? (
                  <>
                    <Text style={styles.fieldLabel}>Titel</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Titel"
                      value={draftCard.title}
                      onChangeText={(value) => setDraftCard((prev) => ({ ...prev, title: value }))}
                    />
                    <Text style={styles.fieldLabel}>Kategorie</Text>
                    <Pressable
                      style={styles.input}
                      onPress={() =>
                        setOpenCategoryMenuFor((prev) => (prev === `edit-${card.taskCardId}` ? null : `edit-${card.taskCardId}`))
                      }
                    >
                      <Text>{draftCard.category || 'Kategorie auswählen'}</Text>
                    </Pressable>
                    {openCategoryMenuFor === `edit-${card.taskCardId}` && (
                      <View style={styles.dropdownMenu}>
                        {knownCategories.map((categoryOption) => (
                          <Pressable
                            key={`edit-${card.taskCardId}-${categoryOption}`}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setDraftCard((prev) => ({ ...prev, category: categoryOption }));
                              setOpenCategoryMenuFor(null);
                            }}
                          >
                            <Text>{categoryOption}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  <Text style={styles.fieldLabel}>Beschreibung</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput]}
                    multiline
                    placeholder="Beschreibung"
                    value={draftCard.description}
                    onChangeText={(value) => setDraftCard((prev) => ({ ...prev, description: value }))}
                  />
                  <Text style={styles.fieldLabel}>Daran denken</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput]}
                    multiline
                    placeholder={'Daran denken (eine Zeile = eine Aufgabe)'}
                    value={draftCard.thinkingTasksText}
                    onChangeText={(value) => setDraftCard((prev) => ({ ...prev, thinkingTasksText: value }))}
                  />
                  <Text style={styles.fieldLabel}>Machen</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput]}
                    multiline
                    placeholder={'Machen (eine Zeile = eine Aufgabe)'}
                    value={draftCard.doingTasksText}
                    onChangeText={(value) => setDraftCard((prev) => ({ ...prev, doingTasksText: value }))}
                  />
                  <View style={styles.actionsRow}>
                    <Pressable style={[styles.actionButton, styles.meButton]} onPress={saveEditedCard}>
                      <Text style={styles.actionText}>Speichern</Text>
                    </Pressable>
                    <Pressable style={[styles.actionButton, styles.discardButton]} onPress={cancelEditingCard}>
                      <Text style={styles.actionText}>Abbrechen</Text>
                    </Pressable>
                  </View>
                </>
                ) : (
                  <>
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
                    Zuständigkeit: {card.suggestedOwner ? ownerNames[card.suggestedOwner] ?? card.suggestedOwner : 'Offen'}
                  </Text>

                  <View style={styles.actionsRow}>
                    <Pressable style={[styles.actionButton, styles.meButton]} onPress={() => handleAction(card, 'take_me')}>
                      <Text style={styles.actionText}>Nata</Text>
                    </Pressable>
                    <Pressable style={[styles.actionButton, styles.partnerButton]} onPress={() => handleAction(card, 'take_partner')}>
                      <Text style={styles.actionText}>Sten</Text>
                    </Pressable>
                  </View>
                  <View style={styles.actionsRow}>
                    <Pressable style={[styles.actionButton, styles.discardButton]} onPress={() => handleAction(card, 'discard')}>
                      <Text style={styles.actionText}>Nicht relevant</Text>
                    </Pressable>
                    <Pressable style={[styles.actionButton, styles.partnerButton]} onPress={() => startEditingCard(card)}>
                      <Text style={styles.actionText}>Bearbeiten</Text>
                    </Pressable>
                  </View>
                </>
                ))}
            </View>
          ))}
        </View>
      ))}

      {showNewCardForm && (
        <View style={styles.categorySection}>
          <Text style={styles.categoryTitle}>Neue Aufgabe hinzufügen</Text>
          <Text style={styles.fieldLabel}>Titel</Text>
          <TextInput
            style={styles.input}
            placeholder="Titel der Aufgabe"
            value={newCard.title}
            onChangeText={(value) => setNewCard((prev) => ({ ...prev, title: value }))}
          />
          <Text style={styles.fieldLabel}>Kategorie</Text>
          <Pressable
            style={styles.input}
            onPress={() => setOpenCategoryMenuFor((prev) => (prev === 'new-card' ? null : 'new-card'))}
          >
            <Text>{newCard.category || 'Kategorie auswählen'}</Text>
          </Pressable>
          {openCategoryMenuFor === 'new-card' && (
            <View style={styles.dropdownMenu}>
              {knownCategories.map((categoryOption) => (
                <Pressable
                  key={`new-${categoryOption}`}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setNewCard((prev) => ({ ...prev, category: categoryOption }));
                    setOpenCategoryMenuFor(null);
                  }}
                >
                  <Text>{categoryOption}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <Text style={styles.fieldLabel}>Beschreibung</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            multiline
            placeholder="Beschreibung"
            value={newCard.description}
            onChangeText={(value) => setNewCard((prev) => ({ ...prev, description: value }))}
          />
          <Pressable style={[styles.actionButton, styles.meButton]} onPress={addNewCard}>
            <Text style={styles.actionText}>Neu hinzufügen</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.categorySection}>
        <Pressable style={styles.collapseHeader} onPress={() => setCollapsedDiscarded((prev) => !prev)}>
          <Text style={styles.categoryTitle}>Nicht relevant ({discardedCards.length})</Text>
          <Text style={styles.metaText}>{collapsedDiscarded ? 'Ausklappen' : 'Einklappen'}</Text>
        </Pressable>
        {!collapsedDiscarded && (
          <>
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
          </>
        )}
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
  statusText: {
    color: '#1e293b',
    textAlign: 'center',
    fontWeight: '600',
  },
  infoText: {
    color: '#475569',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#93c5fd',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
  },
  filterButtonActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  filterButtonText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#ffffff',
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
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
  actionText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    color: '#0f172a',
  },
  fieldLabel: {
    color: '#0f172a',
    fontWeight: '700',
    marginTop: 2,
  },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  multilineInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  collapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
