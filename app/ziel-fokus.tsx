import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function ZielFokusScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Diese Bereiche sind jetzt wichtig</Text>
      <Text style={styles.text}>Basierend auf euren Antworten lohnt es sich, hier anzusetzen:</Text>
      <Text style={styles.item}>• Termine und Organisation</Text>
      <Text style={styles.item}>• Alltag und Versorgung</Text>
      <Text style={styles.item}>• Gesundheit</Text>
      <Pressable style={styles.button} onPress={() => router.push('/aufgaben' as never)}>
        <Text style={styles.buttonText}>Aufgaben ansehen</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({ container: { flex: 1, padding: 24, gap: 8 }, title: { fontSize: 28, fontWeight: '700' }, text: { color: '#334155' }, item: { fontWeight: '600' }, button: { marginTop: 'auto', backgroundColor: '#2563eb', borderRadius: 10, padding: 12 }, buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' } });
