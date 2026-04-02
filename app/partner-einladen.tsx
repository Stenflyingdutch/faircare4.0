import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function PartnerEinladenScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Partner einladen</Text>
      <Text style={styles.text}>Erstelle einen Einladungscode für deinen Partner.</Text>
      <Text style={styles.text}>Sobald ihr beide das Quiz gemacht habt, könnt ihr euer gemeinsames Ergebnis sehen.</Text>

      <Pressable style={styles.button} onPress={() => router.push('/einladungscode' as never)}>
        <Text style={styles.buttonText}>Code erstellen</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 10, justifyContent: 'center' },
  title: { fontSize: 30, fontWeight: '700' },
  text: { color: '#334155' },
  button: { marginTop: 8, backgroundColor: '#2563eb', borderRadius: 10, padding: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
