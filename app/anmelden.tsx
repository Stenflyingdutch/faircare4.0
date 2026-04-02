import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';
import { getGermanFirebaseError } from '@/lib/firebaseError';

export default function AnmeldenScreen() {
  const { user, login, completePasswordSetup } = useAuth();
  const { session, markPasswordSetupDone } = useMentalLoadFlow();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [status, setStatus] = useState('');

  const knownEmail = useMemo(() => {
    const normalized = email.trim().toLowerCase();
    return [session.initiatorUser?.email?.toLowerCase(), session.partnerUser?.email?.toLowerCase()].includes(normalized);
  }, [email, session.initiatorUser?.email, session.partnerUser?.email]);

  const normalizedEmail = email.trim().toLowerCase();
  const isInitiatorEmail = session.initiatorUser?.email?.toLowerCase() === normalizedEmail;
  const isPartnerEmail = session.partnerUser?.email?.toLowerCase() === normalizedEmail;

  if (user) {
    return <Redirect href={'/startseite' as never} />;
  }

  const handleSubmit = async () => {
    if (!password || password !== passwordRepeat) {
      setStatus('Bitte gib ein Passwort ein und bestätige es identisch.');
      return;
    }

    try {
      setStatus('Kennwort wird gesetzt ...');
      await completePasswordSetup(email.trim(), password, email.split('@')[0] || 'Nutzer');
      markPasswordSetupDone(email.trim());
      await login(email.trim(), password);

      const nextInitiatorDone = session.passwordSetup.initiator || Boolean(isInitiatorEmail);
      const nextPartnerDone = session.passwordSetup.partner || Boolean(isPartnerEmail);
      const canOpenSharedResult = session.notificationState.partnerCompleted && nextInitiatorDone && nextPartnerDone;

      router.replace((canOpenSharedResult ? '/gemeinsames-ergebnis' : '/startseite') as never);
    } catch (error) {
      setStatus(`Fehler: ${getGermanFirebaseError(error)}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Anmelden & Kennwort festlegen</Text>
      <Text style={styles.text}>Melde dich mit deiner registrierten E-Mail an und lege dein Kennwort fest.</Text>
      {!knownEmail && email.length > 3 && <Text style={styles.warning}>E-Mail ist noch nicht im Partner-Kontext hinterlegt.</Text>}
      <TextInput
        placeholder="E-Mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        placeholder="Kennwort"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <TextInput
        placeholder="Kennwort wiederholen"
        value={passwordRepeat}
        onChangeText={setPasswordRepeat}
        secureTextEntry
        style={styles.input}
      />

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
  warning: { color: '#b45309', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  button: { marginTop: 8, backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  status: { minHeight: 24, color: '#111827' },
});
