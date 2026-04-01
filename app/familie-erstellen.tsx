import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getGermanFirebaseError } from '@/lib/firebaseError';
import { createFamily } from '@/services/familyService';

export default function FamilieErstellenScreen() {
  const { user } = useAuth();
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) {
    return <Redirect href="/anmelden" />;
  }

  const handleCreateFamily = async () => {
    setIsSubmitting(true);
    setStatus('Familie wird erstellt ...');
    try {
      const result = await createFamily({ uid: user.uid, familyName: familyName.trim() });
      setInviteCode(result.inviteCode);
      setStatus('Familie wurde erfolgreich erstellt.');
    } catch (error) {
      setStatus(`Fehler: ${getGermanFirebaseError(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Familie erstellen</Text>
      <TextInput
        placeholder="Familienname"
        value={familyName}
        onChangeText={setFamilyName}
        style={styles.input}
      />
      <Pressable style={styles.button} onPress={handleCreateFamily} disabled={isSubmitting}>
        <Text style={styles.buttonText}>Familie anlegen</Text>
      </Pressable>
      <Text style={styles.status}>{status}</Text>
      <Text style={styles.inviteCode}>Einladungscode: {inviteCode || '-'}</Text>

      {!!inviteCode && (
        <View style={styles.nextStepsBox}>
          <Text style={styles.nextStepsTitle}>Nächster Testschritt</Text>
          <Text style={styles.nextStepsText}>1) Teilen Sie den Einladungscode mit dem zweiten Konto.</Text>
          <Text style={styles.nextStepsText}>2) Öffnen Sie Startseite, um die Familie sichtbar zu sehen.</Text>
          <Text style={styles.nextStepsText}>3) Danach optional Kind anlegen.</Text>

          <Pressable style={styles.secondaryButton} onPress={() => router.replace('/startseite')}>
            <Text style={styles.buttonText}>Zur Startseite</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 12 },
  secondaryButton: { backgroundColor: '#0ea5e9', borderRadius: 8, paddingVertical: 12, marginTop: 8 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  status: { minHeight: 24, color: '#111827' },
  inviteCode: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  nextStepsBox: {
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  nextStepsTitle: { fontWeight: '700', fontSize: 16, marginBottom: 4 },
  nextStepsText: { color: '#1f2937' },
});
