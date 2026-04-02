import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';

export default function EinladungscodeScreen() {
  const { getInviteCode } = useMentalLoadFlow();
  const code = getInviteCode();
  const [status, setStatus] = useState('');

  const onCopy = async () => {
    try {
      const clipboard = (globalThis as { navigator?: { clipboard?: { writeText: (value: string) => Promise<void> } } }).navigator?.clipboard;
      if (clipboard?.writeText) {
        await clipboard.writeText(code);
        setStatus('Code wurde in die Zwischenablage kopiert.');
        return;
      }

      await Share.share({ message: `Dein Einladungscode: ${code}` });
      setStatus('Direktes Kopieren ist hier nicht verfügbar. Code wurde zum Teilen geöffnet.');
    } catch {
      setStatus('Code konnte nicht kopiert werden. Bitte manuell übernehmen.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Einladungscode</Text>
      <Text style={styles.text}>Dein Partner kann auf der Startseite „Ich habe einen Einladungscode“ wählen und diesen Code eingeben.</Text>
      <Text style={styles.code}>{code}</Text>
      <Pressable style={styles.button} onPress={onCopy}><Text style={styles.buttonText}>Code kopieren</Text></Pressable>
      {!!status && <Text style={styles.status}>{status}</Text>}
      <Pressable style={styles.secondary} onPress={() => router.replace('/startseite' as never)}><Text style={styles.secondaryText}>Zur Startseite</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 30, fontWeight: '700' },
  text: { color: '#334155' },
  code: { fontSize: 36, letterSpacing: 2, fontWeight: '700', color: '#1d4ed8', textAlign: 'center' },
  button: { backgroundColor: '#2563eb', borderRadius: 10, padding: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  status: { color: '#334155' },
  secondary: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12 },
  secondaryText: { textAlign: 'center', fontWeight: '600' },
});
