import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';

export default function InviteTokenScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { session, claimInvite } = useMentalLoadFlow();

  const inviteToken = useMemo(() => (Array.isArray(token) ? token[0] : token) ?? '', [token]);
  const isValidToken = inviteToken.length > 0 && inviteToken === session.pairOrHouseholdContext.inviteToken;

  useEffect(() => {
    if (isValidToken) {
      claimInvite();
    }
  }, [claimInvite, isValidToken]);

  if (!inviteToken) {
    return <Redirect href={'/' as never} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Partner-Einladung</Text>
      {isValidToken ? (
        <>
          <Text style={styles.text}>Einladung erkannt. Die Kinderdaten werden aus dem Paar-Kontext übernommen.</Text>
          <Text style={styles.text}>Bevor das Partner-Quiz startet, registriere dich kurz mit Name und E-Mail.</Text>
          <Pressable style={styles.button} onPress={() => router.replace({ pathname: '/registrieren', params: { mode: 'partner', stage: 'prequiz', forceGuest: '1' } } as never)}>
            <Text style={styles.buttonText}>Weiter zur Registrierung</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.error}>Der Einladungslink ist ungültig oder gehört zu einem anderen Paar-Kontext.</Text>
          <Pressable style={styles.secondary} onPress={() => router.replace('/' as never)}>
            <Text style={styles.secondaryText}>Zurück zum Start</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '700' },
  text: { color: '#334155' },
  error: { color: '#b91c1c', fontWeight: '600' },
  button: { backgroundColor: '#2563eb', borderRadius: 10, padding: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  secondary: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12 },
  secondaryText: { textAlign: 'center', fontWeight: '600' },
});
