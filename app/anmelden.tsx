import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getGermanFirebaseError } from '@/lib/firebaseError';

export default function AnmeldenScreen() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');

  if (user) {
    return <Redirect href={'/startseite' as never} />;
  }

  const handleSubmit = async () => {
    try {
      setStatus('Login läuft ...');
      await login(email.trim(), password);
      router.replace('/startseite' as never);
    } catch (error) {
      setStatus(`Fehler: ${getGermanFirebaseError(error)}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Einloggen</Text>
      <Text style={styles.text}>Melde dich mit deinem bestehenden Konto an.</Text>
      <TextInput
        placeholder="E-Mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput placeholder="Kennwort" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />

      <Pressable style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Weiter</Text>
      </Pressable>

      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 10 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  text: { color: '#334155', textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  button: { marginTop: 8, backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  status: { minHeight: 24, color: '#111827' },
});
