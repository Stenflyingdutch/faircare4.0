import { Redirect } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { getGermanFirebaseError } from '@/lib/firebaseError';
import { type QuizCategory } from '@/lib/quizQuestions';
import { collectionNames, getCurrentUserFamilyId } from '@/services/familyService';
import {
  createTaskCard,
  deleteTaskCard,
  generateTaskCardsFromLatestResult,
  loadTaskCardsByFamilyId,
  updateTaskCard,
} from '@/services/taskCardService';

type TaskCardListItem = Awaited<ReturnType<typeof loadTaskCardsByFamilyId>>[number];
type Frequency = 'daily' | 'weekly' | 'ad-hoc';
type OwnerFilter = 'all' | 'mine' | 'partner';

type EditableCardFields = {
  title: string;
  category: QuizCategory;
  description: string;
  hiddenResponsibilities: string;
  frequency: Frequency;
  suggestedOwner: string;
};

const frequencyOptions: Frequency[] = ['daily', 'weekly', 'ad-hoc'];
const taskCardCategories: QuizCategory[] = [
  'Ernährung',
  'Schlaf',
  'Hygiene',
  'Gesundheit',
  'Organisation',
  'Haushalt mit Baby',
  'Mental Load',
];

function toEditableCard(card: TaskCardListItem): EditableCardFields {
  return {
    title: card.title,
    category: card.category,
    description: card.description,
    hiddenResponsibilities: card.hiddenResponsibilities.join(', '),
    frequency: card.frequency,
    suggestedOwner: card.suggestedOwner,
  };
}

export default function KartenScreen() {
  const { user } = useAuth();
  const [cards, setCards] = useState<TaskCardListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditableCardFields | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [newCardDraft, setNewCardDraft] = useState<EditableCardFields>({
    title: '',
    category: taskCardCategories[0],
    description: '',
    hiddenResponsibilities: '',
    frequency: 'weekly',
    suggestedOwner: '',
  });

  const loadCards = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsLoading(true);
    setStatus('Karten werden geladen ...');

    try {
      const resolvedFamilyId = await getCurrentUserFamilyId(user.uid);
      setFamilyId(resolvedFamilyId);

      if (!resolvedFamilyId) {
        setCards([]);
        setStatus('Kein Familienkonto gefunden.');
        return;
      }

      const familySnapshot = await getDoc(doc(db, collectionNames.families, resolvedFamilyId));
      const memberIds = (familySnapshot.data()?.memberIds as string[] | undefined) ?? [];
      const resolvedPartnerId = memberIds.find((memberId) => memberId !== user.uid) ?? null;
      setPartnerId(resolvedPartnerId);

      const loadedCards = await loadTaskCardsByFamilyId(resolvedFamilyId);
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

      setNewCardDraft((current) => ({
        ...current,
        suggestedOwner: current.suggestedOwner || user.uid,
      }));

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

  const startEditing = (card: TaskCardListItem) => {
    setEditingCardId(card.taskCardId);
    setDraft(toEditableCard(card));
  };

  const stopEditing = () => {
    setEditingCardId(null);
    setDraft(null);
  };

  const parseResponsibilities = (input: string) =>
    input
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const handleSaveCard = async (taskCardId: string) => {
    if (!draft || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      await updateTaskCard(taskCardId, {
        title: draft.title.trim(),
        category: draft.category,
        description: draft.description.trim(),
        hiddenResponsibilities: parseResponsibilities(draft.hiddenResponsibilities),
        frequency: draft.frequency,
        suggestedOwner: draft.suggestedOwner,
      });
      setStatus('Karte gespeichert.');
      stopEditing();
      await loadCards();
    } catch (error) {
      setStatus(`Fehler beim Speichern: ${getGermanFirebaseError(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCard = async (taskCardId: string) => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await deleteTaskCard(taskCardId);
      setStatus('Karte wurde gelöscht.');
      if (editingCardId === taskCardId) {
        stopEditing();
      }
      await loadCards();
    } catch (error) {
      setStatus(`Fehler beim Löschen: ${getGermanFirebaseError(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCard = async () => {
    if (!familyId || !newCardDraft.title.trim() || !newCardDraft.description.trim() || isSaving) {
      setStatus('Bitte Titel und Beschreibung für die neue Karte ausfüllen.');
      return;
    }

    setIsSaving(true);
    try {
      await createTaskCard(familyId, {
        title: newCardDraft.title.trim(),
        category: newCardDraft.category,
        description: newCardDraft.description.trim(),
        hiddenResponsibilities: parseResponsibilities(newCardDraft.hiddenResponsibilities),
        frequency: newCardDraft.frequency,
        suggestedOwner: newCardDraft.suggestedOwner || user?.uid || '',
      });
      setStatus('Neue Karte erstellt.');
      setNewCardDraft({
        title: '',
        category: taskCardCategories[0],
        description: '',
        hiddenResponsibilities: '',
        frequency: 'weekly',
        suggestedOwner: user?.uid ?? '',
      });
      await loadCards();
    } catch (error) {
      setStatus(`Fehler beim Erstellen: ${getGermanFirebaseError(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCards();
    }, [loadCards]),
  );

  const filteredCards = useMemo(
    () =>
      cards.filter((card) => {
        if (!user) {
          return false;
        }
        if (ownerFilter === 'mine') {
          return card.suggestedOwner === user.uid;
        }
        if (ownerFilter === 'partner') {
          return partnerId ? card.suggestedOwner === partnerId : false;
        }
        return true;
      }),
    [cards, ownerFilter, partnerId, user],
  );

  const groupedCards = useMemo(() => {
    return filteredCards.reduce<Record<string, TaskCardListItem[]>>((acc, card) => {
      if (!acc[card.category]) {
        acc[card.category] = [];
      }
      acc[card.category].push(card);
      return acc;
    }, {});
  }, [filteredCards]);

  if (!user) {
    return <Redirect href="/anmelden" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Karten</Text>
      <Text style={styles.subtitle}>Übersicht nach Kategorien inkl. Filter, Bearbeiten, Löschen und Neu-Anlegen.</Text>

      <Pressable style={styles.generateButton} onPress={handleGenerateCards}>
        <Text style={styles.buttonText}>Karten aus Ergebnissen erzeugen</Text>
      </Pressable>

      <Pressable style={styles.reloadButton} onPress={loadCards}>
        <Text style={styles.buttonText}>Karten neu laden</Text>
      </Pressable>

      <View style={styles.filterRow}>
        <Pressable
          style={[styles.filterButton, ownerFilter === 'all' && styles.filterButtonActive]}
          onPress={() => setOwnerFilter('all')}
        >
          <Text style={styles.filterText}>Alle</Text>
        </Pressable>
        <Pressable
          style={[styles.filterButton, ownerFilter === 'mine' && styles.filterButtonActive]}
          onPress={() => setOwnerFilter('mine')}
        >
          <Text style={styles.filterText}>Meine</Text>
        </Pressable>
        <Pressable
          style={[styles.filterButton, ownerFilter === 'partner' && styles.filterButtonActive]}
          onPress={() => setOwnerFilter('partner')}
        >
          <Text style={styles.filterText}>Partner</Text>
        </Pressable>
      </View>

      <Text style={styles.statusText}>{status}</Text>
      {isLoading && <Text style={styles.infoText}>Lade ...</Text>}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Neue Karte anlegen</Text>
        <TextInput
          style={styles.input}
          value={newCardDraft.title}
          placeholder="Titel"
          onChangeText={(value) => setNewCardDraft((current) => ({ ...current, title: value }))}
        />
        <TextInput
          style={styles.input}
          value={newCardDraft.description}
          placeholder="Beschreibung"
          onChangeText={(value) => setNewCardDraft((current) => ({ ...current, description: value }))}
        />
        <TextInput
          style={styles.input}
          value={newCardDraft.hiddenResponsibilities}
          placeholder="Versteckte Aufgaben (Komma-getrennt)"
          onChangeText={(value) => setNewCardDraft((current) => ({ ...current, hiddenResponsibilities: value }))}
        />

        <Text style={styles.inlineLabel}>Kategorie</Text>
        <View style={styles.optionRow}>
          {taskCardCategories.map((category: QuizCategory) => (
            <Pressable
              key={`new-${category}`}
              style={[styles.optionButton, newCardDraft.category === category && styles.optionButtonActive]}
              onPress={() => setNewCardDraft((current) => ({ ...current, category }))}
            >
              <Text style={styles.optionText}>{category}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.inlineLabel}>Häufigkeit</Text>
        <View style={styles.optionRow}>
          {frequencyOptions.map((frequency) => (
            <Pressable
              key={`new-${frequency}`}
              style={[styles.optionButton, newCardDraft.frequency === frequency && styles.optionButtonActive]}
              onPress={() => setNewCardDraft((current) => ({ ...current, frequency }))}
            >
              <Text style={styles.optionText}>{frequency}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.inlineLabel}>Zuständig</Text>
        <View style={styles.optionRow}>
          <Pressable
            style={[styles.optionButton, newCardDraft.suggestedOwner === user.uid && styles.optionButtonActive]}
            onPress={() => setNewCardDraft((current) => ({ ...current, suggestedOwner: user.uid }))}
          >
            <Text style={styles.optionText}>Ich</Text>
          </Pressable>
          {partnerId && (
            <Pressable
              style={[
                styles.optionButton,
                newCardDraft.suggestedOwner === partnerId && styles.optionButtonActive,
              ]}
              onPress={() => setNewCardDraft((current) => ({ ...current, suggestedOwner: partnerId }))}
            >
              <Text style={styles.optionText}>Partner</Text>
            </Pressable>
          )}
        </View>

        <Pressable style={styles.createButton} onPress={handleCreateCard} disabled={isSaving}>
          <Text style={styles.buttonText}>Neue Karte speichern</Text>
        </Pressable>
      </View>

      {Object.entries(groupedCards).map(([category, categoryCards]) => (
        <View key={category} style={styles.categorySection}>
          <Text style={styles.categoryTitle}>{category}</Text>

          {categoryCards.map((card) => {
            const isEditing = editingCardId === card.taskCardId && draft;
            return (
              <View key={card.taskCardId} style={styles.card}>
                {isEditing && draft ? (
                  <>
                    <TextInput
                      style={styles.input}
                      value={draft.title}
                      onChangeText={(value) => setDraft((current) => (current ? { ...current, title: value } : current))}
                    />
                    <TextInput
                      style={styles.input}
                      value={draft.description}
                      onChangeText={(value) =>
                        setDraft((current) => (current ? { ...current, description: value } : current))
                      }
                    />
                    <TextInput
                      style={styles.input}
                      value={draft.hiddenResponsibilities}
                      onChangeText={(value) =>
                        setDraft((current) => (current ? { ...current, hiddenResponsibilities: value } : current))
                      }
                    />

                    <Text style={styles.inlineLabel}>Kategorie</Text>
                    <View style={styles.optionRow}>
                      {taskCardCategories.map((entry: QuizCategory) => (
                        <Pressable
                          key={`${card.taskCardId}-${entry}`}
                          style={[styles.optionButton, draft.category === entry && styles.optionButtonActive]}
                          onPress={() => setDraft((current) => (current ? { ...current, category: entry } : current))}
                        >
                          <Text style={styles.optionText}>{entry}</Text>
                        </Pressable>
                      ))}
                    </View>

                    <Text style={styles.inlineLabel}>Häufigkeit</Text>
                    <View style={styles.optionRow}>
                      {frequencyOptions.map((entry) => (
                        <Pressable
                          key={`${card.taskCardId}-${entry}`}
                          style={[styles.optionButton, draft.frequency === entry && styles.optionButtonActive]}
                          onPress={() => setDraft((current) => (current ? { ...current, frequency: entry } : current))}
                        >
                          <Text style={styles.optionText}>{entry}</Text>
                        </Pressable>
                      ))}
                    </View>

                    <Text style={styles.inlineLabel}>Zuständig</Text>
                    <View style={styles.optionRow}>
                      <Pressable
                        style={[
                          styles.optionButton,
                          draft.suggestedOwner === user.uid && styles.optionButtonActive,
                        ]}
                        onPress={() =>
                          setDraft((current) => (current ? { ...current, suggestedOwner: user.uid } : current))
                        }
                      >
                        <Text style={styles.optionText}>Ich</Text>
                      </Pressable>
                      {partnerId && (
                        <Pressable
                          style={[
                            styles.optionButton,
                            draft.suggestedOwner === partnerId && styles.optionButtonActive,
                          ]}
                          onPress={() =>
                            setDraft((current) => (current ? { ...current, suggestedOwner: partnerId } : current))
                          }
                        >
                          <Text style={styles.optionText}>Partner</Text>
                        </Pressable>
                      )}
                    </View>

                    <View style={styles.actionsRow}>
                      <Pressable style={[styles.actionButton, styles.saveButton]} onPress={() => handleSaveCard(card.taskCardId)}>
                        <Text style={styles.actionText}>Speichern</Text>
                      </Pressable>
                      <Pressable style={[styles.actionButton, styles.cancelButton]} onPress={stopEditing}>
                        <Text style={styles.actionText}>Abbrechen</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.cardTitle}>{card.title}</Text>
                    <Text style={styles.cardDescription}>{card.description}</Text>
                    <Text style={styles.cardMeta}>Häufigkeit: {card.frequency}</Text>
                    <Text style={styles.cardMeta}>Zuständig: {ownerNames[card.suggestedOwner] ?? card.suggestedOwner}</Text>
                    <View style={styles.actionsRow}>
                      <Pressable style={[styles.actionButton, styles.editButton]} onPress={() => startEditing(card)}>
                        <Text style={styles.actionText}>Bearbeiten</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDeleteCard(card.taskCardId)}
                      >
                        <Text style={styles.actionText}>Löschen</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            );
          })}
        </View>
      ))}
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
  createButton: {
    backgroundColor: '#0891b2',
    borderRadius: 8,
    paddingVertical: 10,
  },
  buttonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  filterButtonActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
  },
  filterText: {
    textAlign: 'center',
    color: '#1e293b',
    fontWeight: '600',
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
  categorySection: {
    gap: 8,
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 20,
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
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  inlineLabel: {
    marginTop: 2,
    fontWeight: '700',
    color: '#0f172a',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#ffffff',
  },
  optionButtonActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
  },
  optionText: {
    color: '#1e293b',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
  },
  saveButton: {
    backgroundColor: '#059669',
  },
  cancelButton: {
    backgroundColor: '#475569',
  },
  editButton: {
    backgroundColor: '#2563eb',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
  },
  actionText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '700',
  },
});
