import { Link, Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getGermanFirebaseError } from '@/lib/firebaseError';

export default function AnmeldenScreen() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    return <Redirect href="/startseite" />;
  }

  const handleLogin = async () => {
    setIsSubmitting(true);
    setStatus('Anmeldung läuft ...');
    try {
      await login(email.trim(), password);
      setStatus('Anmeldung erfolgreich. Weiterleitung ...');
      router.replace('/startseite');
    } catch (error) {
      const message = getGermanFirebaseError(error);
      setStatus(`Fehler bei der Anmeldung: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Anmelden</Text>
      <TextInput
        placeholder="E-Mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        placeholder="Passwort"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <Pressable style={styles.button} onPress={handleLogin} disabled={isSubmitting}>
        <Text style={styles.buttonText}>Anmelden</Text>
      </Pressable>

      <Text style={styles.status}>{status}</Text>

      <Link href="/registrieren" style={styles.link}>
        Noch kein Konto? Jetzt registrieren
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700',
  },
  status: {
    minHeight: 40,
    color: '#111827',
  },
  link: {
    textAlign: 'center',
    color: '#2563eb',
    marginTop: 6,
  },
});
