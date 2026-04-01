import { Redirect } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { getGermanFirebaseError } from '@/lib/firebaseError';
import { collectionNames, getCurrentUserFamilyId } from '@/services/familyService';
import { loadLatestResultForFamily, updateAssignmentComparisonForFamily } from '@/services/resultsService';
import { generateTaskCardsFromLatestResult, loadTaskCardsByFamilyId, updateTaskCardDecision } from '@/services/taskCardService';

type TaskCardListItem = Awaited<ReturnType<typeof loadTaskCardsByFamilyId>>[number];

export default function KartenScreen() {
  const { user } = useAuth();
  const [cards, setCards] = useState<TaskCardListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [comparisonText, setComparisonText] = useState('');

  const loadCards = useCallback(async () => {
    if (!user) return;

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

      const ownerIds = [...new Set(loadedCards.flatMap((card) => [card.suggestedOwner, card.assignedTo]).filter(Boolean))] as string[];
      const ownerEntries = await Promise.all(
        ownerIds.map(async (ownerId) => {
          const ownerSnapshot = await getDoc(doc(db, collectionNames.users, ownerId));
          const ownerData = ownerSnapshot.data();
          const name = (ownerData?.displayName as string | undefined) ?? (ownerData?.email as string | undefined) ?? 'Unbekannt';
          return [ownerId, name] as const;
        }),
      );
      setOwnerNames(Object.fromEntries(ownerEntries));

      const comparison = await updateAssignmentComparisonForFamily(familyId);
      if (comparison) {
        const [firstParentId, secondParentId] = Object.keys(comparison.beforeAssignmentMentalLoad);
        setComparisonText(
          `Vor Zuordnung (Mental Load, Schätzung): ${ownerNames[firstParentId] ?? 'Elternteil 1'} ${comparison.beforeAssignmentMentalLoad[firstParentId]}% | ${ownerNames[secondParentId] ?? 'Elternteil 2'} ${comparison.beforeAssignmentMentalLoad[secondParentId]}%\n` +
            `Nach Zuordnung (Mental Load, Schätzung): ${ownerNames[firstParentId] ?? 'Elternteil 1'} ${comparison.afterAssignmentMentalLoad[firstParentId]}% | ${ownerNames[secondParentId] ?? 'Elternteil 2'} ${comparison.afterAssignmentMentalLoad[secondParentId]}%\n` +
            comparison.fairnessMessage,
        );
      }

      setStatus(loadedCards.length > 0 ? 'Karten erfolgreich geladen.' : 'Noch keine Karten vorhanden.');
    } catch (error) {
      setStatus(`Fehler beim Laden: ${getGermanFirebaseError(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, [user, ownerNames]);

  const handleDecision = useCallback(
    async (card: TaskCardListItem, action: 'me' | 'partner' | 'discard' | 'later') => {
      if (!user) return;

      try {
        if (action === 'me') {
          await updateTaskCardDecision(card.taskCardId, {
            assignedTo: user.uid,
            ownershipStatus: 'assigned',
            relevanceStatus: 'active',
          });
          setStatus('Karte wurde dir zugewiesen.');
        } else if (action === 'partner') {
          if (!partnerId) {
            setStatus('Kein Partnerprofil gefunden.');
            return;
          }
          await updateTaskCardDecision(card.taskCardId, {
            assignedTo: partnerId,
            ownershipStatus: 'assigned',
            relevanceStatus: 'active',
          });
          setStatus('Karte wurde dem Partner zugewiesen.');
        } else if (action === 'discard') {
          await updateTaskCardDecision(card.taskCardId, {
            assignedTo: null,
            ownershipStatus: 'discarded',
            relevanceStatus: 'discarded',
          });
          setStatus('Karte wurde als nicht relevant markiert.');
        } else {
          await updateTaskCardDecision(card.taskCardId, {
            assignedTo: null,
            ownershipStatus: 'unassigned',
            relevanceStatus: 'active',
          });
          setStatus('Karte bleibt zur späteren Besprechung offen.');
        }

        await loadCards();
      } catch (error) {
        setStatus(`Fehler beim Speichern: ${getGermanFirebaseError(error)}`);
      }
    },
    [loadCards, partnerId, user],
  );

  const handleGenerateCards = async () => {
    if (!user) return;

    setStatus('30 Karten werden initial erzeugt ...');
    try {
      const outcome = await generateTaskCardsFromLatestResult(user.uid);
      setStatus(`${outcome.createdCount} neue Karten wurden erstellt.`);
      await loadCards();
    } catch (error) {
      setStatus(`Fehler beim Erstellen: ${getGermanFirebaseError(error)}`);
    }
  };

  useFocusEffect(useCallback(() => {
    loadCards();
  }, [loadCards]));

  const grouped = useMemo(() => {
    const active = cards.filter((card) => card.relevanceStatus !== 'discarded');
    const byCategory = active.reduce<Record<string, TaskCardListItem[]>>((acc, card) => {
      acc[card.category] = acc[card.category] ?? [];
      acc[card.category].push(card);
      return acc;
    }, {});

    return {
      byCategory,
      discarded: cards.filter((card) => card.relevanceStatus === 'discarded'),
      mine: cards.filter((card) => card.assignedTo === user?.uid && card.ownershipStatus === 'assigned'),
    };
  }, [cards, user?.uid]);

  if (!user) {
    return <Redirect href="/anmelden" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Karten</Text>
      <Text style={styles.subtitle}>Ownership-Überblick: alle Karten und deine Verantwortungen auf einen Blick.</Text>

      <Pressable style={styles.generateButton} onPress={handleGenerateCards}>
        <Text style={styles.buttonText}>30 Karten initial erzeugen</Text>
      </Pressable>

      <Pressable style={styles.reloadButton} onPress={loadCards}>
        <Text style={styles.buttonText}>Karten neu laden</Text>
      </Pressable>

      <Text style={styles.statusText}>{status}</Text>
      {isLoading && <Text style={styles.infoText}>Lade ...</Text>}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Deine übernommenen Karten</Text>
        {grouped.mine.length === 0 ? <Text style={styles.infoText}>Noch keine Karten von dir übernommen.</Text> : grouped.mine.map((card) => (
          <Text key={`mine-${card.taskCardId}`} style={styles.listText}>• {card.title} ({card.category})</Text>
        ))}
      </View>

      {Object.entries(grouped.byCategory).map(([category, categoryCards]) => (
        <View key={category} style={styles.section}>
          <Text style={styles.sectionTitle}>{category}</Text>
          {categoryCards.map((card) => (
            <View key={card.taskCardId} style={styles.card}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardDescription}>{card.description}</Text>
              <Text style={styles.meta}>Vorgeschlagen: {card.suggestedOwner ? ownerNames[card.suggestedOwner] ?? card.suggestedOwner : 'offen'}</Text>
              <Text style={styles.meta}>Ownership: {card.ownershipStatus}</Text>
              <Text style={styles.sectionSub}>Daran denken</Text>
              {card.thinkingTasks?.map((item) => <Text key={`${card.taskCardId}-${item}`} style={styles.listText}>• {item}</Text>)}
              <Text style={styles.sectionSub}>Machen</Text>
              {card.doingTasks?.map((item) => <Text key={`${card.taskCardId}-doing-${item}`} style={styles.listText}>• {item}</Text>)}

              <View style={styles.actionsRow}>
                <Pressable style={[styles.actionButton, styles.meButton]} onPress={() => handleDecision(card, 'me')}>
                  <Text style={styles.actionText}>Ich übernehme</Text>
                </Pressable>
                <Pressable style={[styles.actionButton, styles.partnerButton]} onPress={() => handleDecision(card, 'partner')}>
                  <Text style={styles.actionText}>Partner übernimmt</Text>
                </Pressable>
              </View>
              <View style={styles.actionsRow}>
                <Pressable style={[styles.actionButton, styles.discardButton]} onPress={() => handleDecision(card, 'discard')}>
                  <Text style={styles.actionText}>Nicht relevant</Text>
                </Pressable>
                <Pressable style={[styles.actionButton, styles.laterButton]} onPress={() => handleDecision(card, 'later')}>
                  <Text style={styles.actionText}>Später besprechen</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ))}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nicht relevant</Text>
        {grouped.discarded.length === 0 ? <Text style={styles.infoText}>Keine verworfenen Karten.</Text> : grouped.discarded.map((card) => (
          <View key={`discarded-${card.taskCardId}`} style={styles.discardedCard}>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Pressable style={[styles.actionButton, styles.restoreButton]} onPress={() => handleDecision(card, 'later')}>
              <Text style={styles.actionText}>Wiederherstellen</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mental-Load-Vergleich (Schätzung)</Text>
        <Text style={styles.infoText}>{comparisonText || 'Noch keine Vergleichsdaten vorhanden.'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fairness-Prinzip</Text>
        <Text style={styles.infoText}>
          Ziel ist nicht 50:50. Ziel ist eine Aufteilung, die sich für beide fair anfühlt und Arbeit, Stress, Alltag und weitere Verantwortungen berücksichtigt.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10, backgroundColor: '#f8fafc' },
  title: { fontSize: 30, fontWeight: '700', textAlign: 'center', color: '#0f172a' },
  subtitle: { textAlign: 'center', color: '#334155' },
  generateButton: { backgroundColor: '#0f766e', borderRadius: 8, paddingVertical: 10 },
  reloadButton: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 10 },
  buttonText: { color: '#ffffff', textAlign: 'center', fontWeight: '700' },
  statusText: { color: '#1e293b', textAlign: 'center', fontWeight: '600' },
  infoText: { color: '#475569' },
  section: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', padding: 10, gap: 6 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  sectionSub: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  card: { borderWidth: 1, borderColor: '#dbeafe', borderRadius: 8, padding: 10, gap: 4, backgroundColor: '#f8fbff' },
  discardedCard: { borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, padding: 10, gap: 8, backgroundColor: '#fff1f2' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  cardDescription: { color: '#334155' },
  meta: { color: '#64748b', fontSize: 12 },
  listText: { color: '#334155' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  actionButton: { flex: 1, borderRadius: 8, paddingVertical: 8 },
  meButton: { backgroundColor: '#0f766e' },
  partnerButton: { backgroundColor: '#4f46e5' },
  discardButton: { backgroundColor: '#dc2626' },
  laterButton: { backgroundColor: '#64748b' },
  restoreButton: { backgroundColor: '#16a34a' },
  actionText: { color: '#fff', textAlign: 'center', fontWeight: '700', fontSize: 12 },
});
