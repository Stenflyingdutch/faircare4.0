import { router } from 'expo-router';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';

export default function PartnerEinladenScreen() {
  const { session } = useMentalLoadFlow();
  const [copyStatus, setCopyStatus] = useState('');
  const inviteLink = `https://faircare.app/invite/${session.pairOrHouseholdContext.inviteToken}`;

  const onShare = async () => {
    await Share.share({
      message: `Mach das Mental-Load-Quiz mit mir: ${inviteLink}`,
    });
  };

  const onCopyLink = async () => {
    const clipboard = (globalThis as { navigator?: { clipboard?: { writeText: (value: string) => Promise<void> } } }).navigator?.clipboard;

    if (clipboard?.writeText) {
      await clipboard.writeText(inviteLink);
      setCopyStatus('Link wurde in die Zwischenablage kopiert.');
      return;
    }

    setCopyStatus('Direktes Kopieren ist auf diesem Gerät nicht verfügbar. Der Link wurde zum Teilen geöffnet.');
    await onShare();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Partner einladen</Text>
      <Text style={styles.text}>Teile den Link mit deinem Partner.</Text>
      <Text style={styles.text}>Sobald ihr beide das Quiz gemacht habt, könnt ihr euer gemeinsames Ergebnis sehen.</Text>
      <Text style={styles.code}>{inviteLink}</Text>

      <Pressable style={styles.button} onPress={onCopyLink}><Text style={styles.buttonText}>Link kopieren</Text></Pressable>
      <Pressable style={styles.button} onPress={onShare}><Text style={styles.buttonText}>Per WhatsApp teilen</Text></Pressable>
      <Pressable style={styles.button} onPress={onShare}><Text style={styles.buttonText}>Per E-Mail teilen</Text></Pressable>

      {copyStatus.length > 0 && <Text style={styles.status}>{copyStatus}</Text>}

      <Pressable style={styles.secondary} onPress={() => router.push({ pathname: '/invite/[token]', params: { token: session.pairOrHouseholdContext.inviteToken } } as never)}>
        <Text style={styles.secondaryText}>Invite lokal testen</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 10 },
  title: { fontSize: 30, fontWeight: '700' },
  text: { color: '#334155' },
  code: { color: '#1d4ed8', fontWeight: '700' },
  button: { backgroundColor: '#2563eb', borderRadius: 10, padding: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  status: { color: '#334155' },
  secondary: { marginTop: 'auto', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12 },
  secondaryText: { textAlign: 'center', fontWeight: '600' },
});
