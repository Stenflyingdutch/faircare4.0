import { Redirect } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getGermanFirebaseError } from '@/lib/firebaseError';
import { getCurrentUserFamilyId } from '@/services/familyService';
import { loadTaskCardsByFamilyId, updateTaskCardDecision } from '@/services/taskCardService';

export default function WochenCheckInScreen() {
  const { user } = useAuth();
  const [cards, setCards] = useState<Awaited<ReturnType<typeof loadTaskCardsByFamilyId>>>([]);
  const [status, setStatus] = useState('');

  const loadCards = useCallback(async () => {
    if (!user) return;
    try {
      const familyId = await getCurrentUserFamilyId(user.uid);
      if (!familyId) {
        setStatus('Kein Familienkonto gefunden.');
        return;
      }
      setCards(await loadTaskCardsByFamilyId(familyId));
    } catch (error) {
      setStatus(getGermanFirebaseError(error));
    }
  }, [user]);

  useFocusEffect(useCallback(() => { loadCards(); }, [loadCards]));

  if (!user) return <Redirect href="/anmelden" />;

  const assigned = cards.filter((card) => card.ownershipStatus === 'assigned');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Wöchentlicher Check-in</Text>
      <Text style={styles.subtitle}>Bereits zugewiesene Karten können jederzeit neu verhandelt werden.</Text>
      <Text style={styles.status}>{status}</Text>

      {assigned.map((card) => (
        <View style={styles.card} key={card.taskCardId}>
          <Text style={styles.cardTitle}>{card.title}</Text>
          <Text style={styles.cardMeta}>Aktuelle Zuordnung: {card.assignedTo ?? 'offen'}</Text>
          <View style={styles.row}>
            <Pressable
              style={styles.btn}
              onPress={async () => {
                await updateTaskCardDecision(card.taskCardId, { assignedTo: null, ownershipStatus: 'unassigned', relevanceStatus: 'active' });
                await loadCards();
              }}
            >
              <Text style={styles.btnText}>Neu verhandeln</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  subtitle: { textAlign: 'center', color: '#475569' },
  status: { color: '#334155' },
  card: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 10, gap: 6 },
  cardTitle: { fontWeight: '700' },
  cardMeta: { color: '#64748b' },
  row: { flexDirection: 'row' },
  btn: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  btnText: { color: '#fff', fontWeight: '700' },
});
