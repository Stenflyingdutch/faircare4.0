import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';
import { getGermanFirebaseError } from '@/lib/firebaseError';

export default function RegistrierungScreen() {
  const { user, register } = useAuth();
  const { saveInitiatorUser, savePartnerUser } = useMentalLoadFlow();
  const params = useLocalSearchParams<{ mode?: string; stage?: string }>();
  const isPartner = params.mode === 'partner';
  const isPartnerPreQuiz = isPartner && params.stage === 'prequiz';
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  if (user) {
    return <Redirect href={'/startseite' as never} />;
  }

  const handleContinue = async () => {
    setStatus('Registrierung läuft ...');
    try {
      await register(email.trim(), null, displayName.trim());
      if (isPartner) {
        savePartnerUser({ id: email.trim().toLowerCase(), displayName: displayName.trim(), email: email.trim() });
      } else {
        saveInitiatorUser({ id: email.trim().toLowerCase(), displayName: displayName.trim(), email: email.trim() });
      }
      if (isPartnerPreQuiz) {
        router.replace({ pathname: '/quiz-intro', params: { mode: 'partner' } } as never);
        return;
      }

      router.replace({ pathname: '/eigenes-ergebnis', params: { mode: isPartner ? 'partner' : 'initiator' } } as never);
    } catch (error) {
      setStatus(`Fehler: ${getGermanFirebaseError(error)}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isPartnerPreQuiz ? 'Kurz registrieren' : 'Ergebnis freischalten'}</Text>
      <Text style={styles.text}>{isPartnerPreQuiz ? 'Das ist die minimale Voraussetzung, damit später das gemeinsame Ergebnis sichtbar ist.' : 'Speichere dein Ergebnis und vergleiche es später mit deinem Partner.'}</Text>
      <TextInput placeholder="Vorname" style={styles.input} value={displayName} onChangeText={setDisplayName} />
      <TextInput
        placeholder="E-Mail-Adresse"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Pressable style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Weiter</Text>
      </Pressable>
      <Text>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 10 },
  title: { fontSize: 28, fontWeight: '700' },
  text: { color: '#334155' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  button: { backgroundColor: '#2563eb', borderRadius: 10, padding: 12 },
  buttonText: { textAlign: 'center', color: '#fff', fontWeight: '700' },
});
