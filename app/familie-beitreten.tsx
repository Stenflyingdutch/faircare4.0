import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getGermanFirebaseError } from '@/lib/firebaseError';
import { joinFamilyByInviteCode } from '@/services/familyService';

export default function FamilieBeitretenScreen() {
  const { user } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isJoined, setIsJoined] = useState(false);

  if (!user) {
    return <Redirect href="/anmelden" />;
  }

  const handleJoinFamily = async () => {
    setIsSubmitting(true);
    setIsJoined(false);
    setStatus('Suche Familie über Einladungscode ...');
    try {
      await joinFamilyByInviteCode({ uid: user.uid, inviteCode });
      setStatus('Beitritt erfolgreich.');
      setIsJoined(true);
    } catch (error) {
      setStatus(`Fehler: ${getGermanFirebaseError(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Familie beitreten</Text>
      <TextInput
        placeholder="Einladungscode"
        value={inviteCode}
        onChangeText={setInviteCode}
        autoCapitalize="characters"
        style={styles.input}
      />
      <Pressable style={styles.button} onPress={handleJoinFamily} disabled={isSubmitting}>
        <Text style={styles.buttonText}>Familie beitreten</Text>
      </Pressable>
      <Text style={styles.status}>{status}</Text>

      {isJoined && (
        <View style={styles.nextStepsBox}>
          <Text style={styles.nextStepsTitle}>Nächster Testschritt</Text>
          <Text style={styles.nextStepsText}>1) Zur Startseite wechseln.</Text>
          <Text style={styles.nextStepsText}>2) Dort sehen Sie die aktive Familie und die Mitgliederzahl.</Text>
          <Text style={styles.nextStepsText}>3) Optional anschließend Kind anlegen.</Text>

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
  button: { backgroundColor: '#16a34a', borderRadius: 8, paddingVertical: 12 },
  secondaryButton: { backgroundColor: '#0ea5e9', borderRadius: 8, paddingVertical: 12, marginTop: 8 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  status: { minHeight: 24, color: '#111827' },
  nextStepsBox: {
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  nextStepsTitle: { fontWeight: '700', fontSize: 16, marginBottom: 4 },
  nextStepsText: { color: '#1f2937' },
});
