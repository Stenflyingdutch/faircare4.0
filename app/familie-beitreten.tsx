import { Redirect } from 'expo-router';
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

  if (!user) {
    return <Redirect href="/anmelden" />;
  }

  const handleJoinFamily = async () => {
    setIsSubmitting(true);
    setStatus('Suche Familie über Einladungscode ...');
    try {
      const result = await joinFamilyByInviteCode({ uid: user.uid, inviteCode });
      setStatus(`Beitritt erfolgreich. Familien-ID: ${result.familyId}`);
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
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  status: { minHeight: 24, color: '#111827' },
});
