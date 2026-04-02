import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';

function isInviteCodeFormatValid(code: string) {
  return /^[A-Z0-9]{6}$/.test(code);
}

export default function FamilieBeitretenScreen() {
  const { setPendingInviteCode } = useMentalLoadFlow();
  const [inviteCode, setInviteCode] = useState('');
  const [status, setStatus] = useState('');

  const handleContinue = () => {
    const code = inviteCode.trim().toUpperCase();

    if (!isInviteCodeFormatValid(code)) {
      setStatus('Der Code ist ungültig. Bitte prüfe den Einladungscode.');
      return;
    }

    setPendingInviteCode(code);
    setStatus('Code gespeichert. Quiz wird gestartet ...');
    router.replace({ pathname: '/quiz-intro', params: { mode: 'partner' } } as never);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mit Einladungscode starten</Text>
      <Text style={styles.text}>Gib den Code ein, den du erhalten hast.</Text>
      <TextInput
        placeholder="Code"
        value={inviteCode}
        onChangeText={setInviteCode}
        autoCapitalize="characters"
        style={styles.input}
      />
      <Pressable style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Weiter</Text>
      </Pressable>
      {!!status && <Text style={styles.status}>{status}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 30, fontWeight: '700' },
  text: { color: '#334155' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  button: { backgroundColor: '#2563eb', borderRadius: 10, padding: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  status: { color: '#334155' },
});
