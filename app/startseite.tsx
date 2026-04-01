import { Redirect, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { getGermanFirebaseError } from '@/lib/firebaseError';
import { getCurrentUserFamilyId } from '@/services/familyService';

type FamilySummary = {
  name: string;
  inviteCode: string;
  memberCount: number;
};

export default function StartseiteScreen() {
  const { user, logout } = useAuth();
  const [status, setStatus] = useState('Noch keine Aktion ausgeführt.');
  const [childrenCount, setChildrenCount] = useState<number | null>(null);
  const [familySummary, setFamilySummary] = useState<FamilySummary | null>(null);

  const loadFamilyData = useCallback(async () => {
    if (!user) {
      return;
    }

    setStatus('Lade Familienbezug ...');
    try {
      const currentFamilyId = await getCurrentUserFamilyId(user.uid);

      if (!currentFamilyId) {
        setFamilySummary(null);
        setChildrenCount(0);
        setStatus('Keiner Familie zugeordnet.');
        return;
      }

      const familySnapshot = await getDoc(doc(db, 'families', currentFamilyId));
      const familyData = familySnapshot.data();
      setFamilySummary({
        name: (familyData?.name as string | undefined) ?? 'Unbekannte Familie',
        inviteCode: (familyData?.inviteCode as string | undefined) ?? '-',
        memberCount: Array.isArray(familyData?.memberIds) ? familyData.memberIds.length : 0,
      });

      const childrenSnapshot = await getDocs(
        query(collection(db, 'children'), where('familyId', '==', currentFamilyId)),
      );
      setChildrenCount(childrenSnapshot.size);
      setStatus('Familienbezogene Daten geladen.');
    } catch (error) {
      setStatus(`Fehler beim Laden: ${getGermanFirebaseError(error)}`);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadFamilyData();
    }, [loadFamilyData]),
  );

  if (!user) {
    return <Redirect href="/anmelden" />;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      setStatus(`Fehler beim Abmelden: ${getGermanFirebaseError(error)}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Startseite</Text>
      <Text style={styles.subtitle}>Hallo {user.email ?? 'Nutzer'}!</Text>

      <View style={styles.testBox}>
        <Text style={styles.testTitle}>Familienbereich</Text>

        <Pressable style={styles.primaryLink} onPress={() => router.push('/familie-erstellen' as never)}>
          <Text style={styles.buttonText}>Familie erstellen</Text>
        </Pressable>

        <Pressable style={styles.secondaryLink} onPress={() => router.push('/familie-beitreten' as never)}>
          <Text style={styles.buttonText}>Familie beitreten</Text>
        </Pressable>

        <Pressable style={styles.tertiaryLink} onPress={() => router.push('/kind-anlegen' as never)}>
          <Text style={styles.buttonText}>Kind anlegen</Text>
        </Pressable>

        <Pressable style={styles.quizLink} onPress={() => router.push('/quiz' as never)}>
          <Text style={styles.buttonText}>Fairness-Quiz starten</Text>
        </Pressable>

        <Pressable style={styles.resultsLink} onPress={() => router.push('/ergebnisse' as never)}>
          <Text style={styles.buttonText}>Ergebnisse ansehen</Text>
        </Pressable>

        <Pressable style={styles.loadButton} onPress={loadFamilyData}>
          <Text style={styles.buttonText}>Familiendaten laden</Text>
        </Pressable>

        <Text style={styles.status}>{status}</Text>
        <Text style={styles.dataText}>Anzahl Kinder in der Familie: {childrenCount ?? '-'}</Text>

        {familySummary && (
          <View style={styles.familyCard}>
            <Text style={styles.familyCardTitle}>Ihre Familie ist aktiv</Text>
            <Text style={styles.dataText}>Name: {familySummary.name}</Text>
            <Text style={styles.dataText}>Einladungscode: {familySummary.inviteCode}</Text>
            <Text style={styles.dataText}>Mitglieder: {familySummary.memberCount}</Text>
          </View>
        )}
      </View>

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.buttonText}>Abmelden</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 24,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 8,
  },
  testBox: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 14,
    gap: 10,
    backgroundColor: '#f9fafb',
  },
  testTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  primaryLink: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
  },
  secondaryLink: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 12,
  },
  tertiaryLink: {
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    paddingVertical: 12,
  },
  loadButton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 8,
    paddingVertical: 12,
  },
  quizLink: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingVertical: 12,
  },
  resultsLink: {
    backgroundColor: '#0f766e',
    borderRadius: 8,
    paddingVertical: 12,
  },
  logoutButton: {
    marginTop: 8,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700',
  },
  status: {
    marginTop: 8,
    fontWeight: '600',
  },
  dataText: {
    color: '#111827',
  },
  familyCard: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    padding: 10,
    gap: 4,
  },
  familyCardTitle: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
});
