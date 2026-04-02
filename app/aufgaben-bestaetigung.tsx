import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';

export default function AufgabenBestaetigungScreen() {
  const { completeSetup } = useMentalLoadFlow();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ihr habt die Grundlage gelegt</Text>
      <Text style={styles.text}>Ab jetzt ist klarer, wer woran denkt und was übernimmt.</Text>
      <Text style={styles.text}>So wird Mental Load im Alltag sichtbarer und fairer verteilt.</Text>
      <Pressable style={styles.button} onPress={() => { completeSetup(); router.replace('/startseite' as never); }}>
        <Text style={styles.buttonText}>Zur Startseite</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center', padding: 24, gap: 10 }, title: { fontSize: 30, fontWeight: '700' }, text: { color: '#334155' }, button: { marginTop: 10, backgroundColor: '#2563eb', borderRadius: 10, padding: 12 }, buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' } });
