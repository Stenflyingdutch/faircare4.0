import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

function StartOption({ title, text, cta, onPress }: { title: string; text: string; cta: string; onPress: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardText}>{text}</Text>
      <Pressable style={styles.cta} onPress={onPress}>
        <Text style={styles.ctaText}>{cta}</Text>
      </Pressable>
    </View>
  );
}

export default function StartScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wie möchtet ihr starten</Text>
      <StartOption
        title="Ich starte für uns"
        text="Ich mache das Quiz zuerst und lade danach meinen Partner ein"
        cta="Quiz starten"
        onPress={() => router.push('/kinderanzahl' as never)}
      />
      <StartOption
        title="Ich habe einen Einladungscode"
        text="Mein Partner hat schon gestartet und ich mache jetzt das Quiz"
        cta="Code eingeben"
        onPress={() => router.push('/familie-beitreten' as never)}
      />

      <View style={styles.bottom}>
        <Text style={styles.bottomText}>Schon ein Konto</Text>
        <Pressable onPress={() => router.push('/anmelden' as never)}>
          <Text style={styles.link}>Einloggen</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 14, justifyContent: 'center' },
  title: { fontSize: 30, fontWeight: '700' },
  card: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 14, gap: 8 },
  cardTitle: { fontSize: 20, fontWeight: '700' },
  cardText: { color: '#334155' },
  cta: { backgroundColor: '#2563eb', borderRadius: 10, padding: 12 },
  ctaText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  bottom: { marginTop: 8, flexDirection: 'row', gap: 8, justifyContent: 'center' },
  bottomText: { color: '#334155' },
  link: { color: '#1d4ed8', fontWeight: '700' },
});
