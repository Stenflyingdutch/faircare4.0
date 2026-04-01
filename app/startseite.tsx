import { Redirect, router } from 'expo-router';
import { getDocs, query, where, collection } from 'firebase/firestore';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { getGermanFirebaseError } from '@/lib/firebaseError';
import { getCurrentUserFamilyId } from '@/services/familyService';

export default function StartseiteScreen() {
  const { user, logout } = useAuth();
  const [status, setStatus] = useState('Noch keine Aktion ausgeführt.');
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [childrenCount, setChildrenCount] = useState<number | null>(null);

  if (!user) {
    return <Redirect href="/anmelden" />;
  }

  const loadFamilyData = async () => {
    setStatus('Lade Familienbezug ...');
    try {
      const currentFamilyId = await getCurrentUserFamilyId(user.uid);
      setFamilyId(currentFamilyId);

      if (!currentFamilyId) {
        setChildrenCount(0);
        setStatus('Keiner Familie zugeordnet.');
        return;
      }

      const childrenSnapshot = await getDocs(
        query(collection(db, 'children'), where('familyId', '==', currentFamilyId)),
      );
      setChildrenCount(childrenSnapshot.size);
      setStatus('Familienbezogene Daten geladen.');
    } catch (error) {
      setStatus(`Fehler beim Laden: ${getGermanFirebaseError(error)}`);
    }
  };

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

        <Pressable style={styles.primaryLink} onPress={() => router.push('/familie-erstellen' as never)}><Text style={styles.buttonText}>Familie erstellen</Text></Pressable>

        <Pressable style={styles.secondaryLink} onPress={() => router.push('/familie-beitreten' as never)}><Text style={styles.buttonText}>Familie beitreten</Text></Pressable>

        <Pressable style={styles.tertiaryLink} onPress={() => router.push('/kind-anlegen' as never)}><Text style={styles.buttonText}>Kind anlegen</Text></Pressable>

        <Pressable style={styles.loadButton} onPress={loadFamilyData}>
          <Text style={styles.buttonText}>Familiendaten laden</Text>
        </Pressable>

        <Text style={styles.status}>{status}</Text>
        <Text style={styles.dataText}>Aktuelle Familien-ID: {familyId ?? '-'}</Text>
        <Text style={styles.dataText}>Anzahl Kinder in der Familie: {childrenCount ?? '-'}</Text>
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
    color: '#fff',
    textAlign: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    fontWeight: '700',
  },
  secondaryLink: {
    backgroundColor: '#16a34a',
    color: '#fff',
    textAlign: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    fontWeight: '700',
  },
  tertiaryLink: {
    backgroundColor: '#7c3aed',
    color: '#fff',
    textAlign: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    fontWeight: '700',
  },
  loadButton: {
    backgroundColor: '#0ea5e9',
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
});
