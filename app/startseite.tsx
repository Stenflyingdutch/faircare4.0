import { Redirect } from 'expo-router';
import { Timestamp, addDoc, collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { getGermanFirebaseError } from '@/lib/firebaseError';

type HealthCheck = {
  message?: string;
  source?: string;
  createdAt?: Timestamp | null;
};

export default function StartseiteScreen() {
  const { user, logout } = useAuth();
  const [status, setStatus] = useState('Noch keine Aktion ausgeführt.');
  const [anzahl, setAnzahl] = useState<number | null>(null);
  const [erstesDokument, setErstesDokument] = useState<HealthCheck | null>(null);

  if (!user) {
    return <Redirect href="/anmelden" />;
  }

  const formatHealthCheck = (doc: HealthCheck | null) => {
    if (!doc) {
      return '-';
    }

    const createdAt = doc.createdAt instanceof Timestamp
      ? doc.createdAt.toDate().toLocaleString('de-DE')
      : 'kein Datum im Dokument';

    return `Nachricht: ${doc.message ?? '-'} | Quelle: ${doc.source ?? '-'} | Erstellt am: ${createdAt}`;
  };

  const handleWrite = async () => {
    setStatus('Schreibe Firestore-Testdaten ...');
    try {
      const docRef = await addDoc(collection(db, 'healthChecks'), {
        message: 'Firestore Test erfolgreich geschrieben',
        createdAt: Timestamp.now(),
        source: 'expo-app',
      });
      setStatus(`Erfolg: Dokument geschrieben mit ID ${docRef.id}`);
    } catch (error) {
      const message = getGermanFirebaseError(error);
      setStatus(`Fehler beim Schreiben: ${message}`);
    }
  };

  const handleRead = async () => {
    setStatus('Lese Firestore-Testdaten ...');
    try {
      const snapshot = await getDocs(collection(db, 'healthChecks'));
      const count = snapshot.size;
      setAnzahl(count);

      const firstDocQuery = query(collection(db, 'healthChecks'), orderBy('createdAt', 'desc'), limit(1));
      const firstDocSnapshot = await getDocs(firstDocQuery);
      const first = firstDocSnapshot.docs[0]?.data() as HealthCheck | undefined;
      setErstesDokument(first ?? null);
      setStatus('Erfolg: Daten gelesen.');
    } catch (error) {
      const message = getGermanFirebaseError(error);
      setStatus(`Fehler beim Lesen: ${message}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      const message = getGermanFirebaseError(error);
      setStatus(`Fehler beim Abmelden: ${message}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Startseite</Text>
      <Text style={styles.subtitle}>Hallo {user.email ?? 'Nutzer'}!</Text>

      <View style={styles.testBox}>
        <Text style={styles.testTitle}>Firestore Testbereich</Text>

        <Pressable style={styles.primaryButton} onPress={handleWrite}>
          <Text style={styles.buttonText}>Firestore Test schreiben</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={handleRead}>
          <Text style={styles.buttonText}>Firestore Test lesen</Text>
        </Pressable>

        <Text style={styles.status}>{status}</Text>
        <Text style={styles.dataText}>Anzahl Dokumente: {anzahl ?? '-'}</Text>
        <Text style={styles.dataText}>Erster Datensatz: {formatHealthCheck(erstesDokument)}</Text>
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
  primaryButton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 8,
    paddingVertical: 12,
  },
  secondaryButton: {
    backgroundColor: '#7c3aed',
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
