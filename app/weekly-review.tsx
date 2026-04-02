import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';

const steps = [
  { title: 'Weekly Review', text: 'Schaut gemeinsam, was gut läuft und was angepasst werden sollte.' },
  { title: 'Was ist passiert', text: 'Erledigte Aufgaben, offene Aufgaben, verschobene Aufgaben, Aufgaben ohne klare Erledigung.' },
  { title: 'Eure Ziele', text: 'So lief es im Vergleich zu euren Zielen.' },
  { title: 'Was lief gut diese Woche', text: 'Was hat euch entlastet oder einfacher gemacht?' },
  { title: 'Wo war es noch schwierig', text: 'Wo war etwas unklar, stressig oder nicht gut verteilt?' },
  { title: 'Was soll sich ändern', text: 'Passt Ziele, Aufgaben oder Zuständigkeiten an.' },
  { title: 'Gute Grundlage für die nächste Woche', text: 'Ihr habt Klarheit geschaffen und euren Alltag weiter angepasst.' },
];

export default function WeeklyReviewScreen() {
  const { saveWeeklyReview } = useMentalLoadFlow();
  const [step, setStep] = useState(0);

  const isLast = step === steps.length - 1;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{steps[step].title}</Text>
      <Text style={styles.text}>{steps[step].text}</Text>
      <Pressable
        style={styles.button}
        onPress={() => {
          if (isLast) {
            saveWeeklyReview({ positives: ['Aufgaben liefen ohne Nachfragen'], challenges: ['Zu viele Rückfragen'], changes: ['Aufgabe neu zuweisen'] });
            return;
          }
          setStep((value) => value + 1);
        }}
      >
        <Text style={styles.buttonText}>{isLast ? 'Fertig' : 'Weiter'}</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center', padding: 24, gap: 10 }, title: { fontSize: 30, fontWeight: '700' }, text: { color: '#334155' }, button: { marginTop: 8, backgroundColor: '#2563eb', borderRadius: 10, padding: 12 }, buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' } });
