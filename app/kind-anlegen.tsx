import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getGermanFirebaseError } from '@/lib/firebaseError';
import { createChildProfile, getCurrentUserFamilyId } from '@/services/familyService';

export default function KindAnlegenScreen() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) {
    return <Redirect href="/anmelden" />;
  }

  const handleCreateChild = async () => {
    setIsSubmitting(true);
    setStatus('Kind wird angelegt ...');
    try {
      const familyId = await getCurrentUserFamilyId(user.uid);

      if (!familyId) {
        throw new Error('Bitte zuerst eine Familie erstellen oder einer Familie beitreten.');
      }

      const result = await createChildProfile({
        familyId,
        name: name.trim(),
        birthDate: birthDate.trim(),
      });
      setStatus(`Kind wurde angelegt. Kind-ID: ${result.childId}`);
    } catch (error) {
      setStatus(`Fehler: ${getGermanFirebaseError(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kind anlegen</Text>
      <TextInput placeholder="Name" value={name} onChangeText={setName} style={styles.input} />
      <TextInput
        placeholder="Geburtsdatum (JJJJ-MM-TT)"
        value={birthDate}
        onChangeText={setBirthDate}
        style={styles.input}
      />
      <Pressable style={styles.button} onPress={handleCreateChild} disabled={isSubmitting}>
        <Text style={styles.buttonText}>Kind speichern</Text>
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
  button: { backgroundColor: '#7c3aed', borderRadius: 8, paddingVertical: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  status: { minHeight: 24, color: '#111827' },
});
