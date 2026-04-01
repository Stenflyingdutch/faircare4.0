import { Redirect } from 'expo-router';
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
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  status: { minHeight: 24, color: '#111827' },
  inviteCode: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
});
