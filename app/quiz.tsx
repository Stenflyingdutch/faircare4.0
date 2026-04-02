import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';

const ANSWERS = [
  { value: 'ich', label: 'Ich' },
  { value: 'fifty', label: '50/50' },
  { value: 'partner', label: 'Partner' },
] as const;

export default function QuizScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const isPartnerFlow = params.mode === 'partner';
  const { questions, session, saveAnswer, completeQuiz, completePartnerFlow } = useMentalLoadFlow();
  const [index, setIndex] = useState(0);
  const [stress, setStress] = useState(3);

  const question = questions[index];
  const currentAnswer = session.anonymousQuizSession.answers.find((item) => item.questionId === question.id);

  const answered = useMemo(
    () => new Set(session.anonymousQuizSession.answers.map((item) => item.questionId)),
    [session.anonymousQuizSession.answers],
  );

  const isLast = index === questions.length - 1;

  return (
    <View style={styles.container}>
      <Text style={styles.progress}>Frage {index + 1} von {questions.length}</Text>
      <Text style={styles.category}>{question.category}</Text>
      <Text style={styles.question}>{question.question}</Text>

      <View style={styles.row}>
        {ANSWERS.map((item) => {
          const selected = currentAnswer?.answer === item.value;
          return (
            <Pressable
              key={item.value}
              style={[styles.choice, selected && styles.choiceActive]}
              onPress={() => saveAnswer({ questionId: question.id, category: question.category, answer: item.value, stress })}
            >
              <Text style={[styles.choiceText, selected && styles.choiceTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.stressTitle}>Stress-Level: {stress}</Text>
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable key={value} style={[styles.stressChip, stress === value && styles.choiceActive]} onPress={() => setStress(value)}>
            <Text>{value}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.nav}>
        <Pressable style={styles.navButton} onPress={() => setIndex((curr) => Math.max(0, curr - 1))}>
          <Text style={styles.navText}>Zurück</Text>
        </Pressable>
        <Pressable
          style={[styles.navButton, !answered.has(question.id) && styles.navDisabled]}
          disabled={!answered.has(question.id)}
          onPress={() => {
            if (isLast) {
              completeQuiz();
              if (isPartnerFlow) {
                completePartnerFlow();
              }
              router.replace('/quiz-teaser' as never);
              return;
            }
            setIndex((curr) => curr + 1);
          }}
        >
          <Text style={styles.navText}>{isLast ? 'Fertig' : 'Weiter'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  progress: { textAlign: 'center', fontWeight: '700', color: '#1d4ed8' },
  category: { fontSize: 16, color: '#64748b' },
  question: { fontSize: 24, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  choiceActive: { backgroundColor: '#dbeafe', borderColor: '#2563eb' },
  choiceText: { color: '#0f172a' },
  choiceTextActive: { color: '#1d4ed8', fontWeight: '700' },
  stressTitle: { marginTop: 4, fontWeight: '600' },
  stressChip: { padding: 10, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, minWidth: 42, alignItems: 'center' },
  nav: { marginTop: 'auto', flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  navButton: { flex: 1, backgroundColor: '#2563eb', borderRadius: 10, padding: 12 },
  navDisabled: { backgroundColor: '#94a3b8' },
  navText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
