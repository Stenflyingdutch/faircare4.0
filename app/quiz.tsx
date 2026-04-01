import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getGermanFirebaseError } from '@/lib/firebaseError';
import { QUIZ_OPTIONS, QUIZ_QUESTIONS, type QuizOption } from '@/lib/quizQuestions';
import { loadQuizAnswersByUser, saveQuizAnswer, type StoredQuizAnswer } from '@/services/quizService';

type AnswerFields = Pick<StoredQuizAnswer, 'doesIt' | 'thinksAboutIt'>;

const PARTS: { key: keyof AnswerFields; label: string }[] = [
  { key: 'doesIt', label: 'Wer macht es?' },
  { key: 'thinksAboutIt', label: 'Wer denkt daran?' },
];

export default function QuizScreen() {
  const { user } = useAuth();
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [answerMap, setAnswerMap] = useState<Map<string, StoredQuizAnswer>>(new Map());
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      if (!user) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await loadQuizAnswersByUser(user.uid);
        setFamilyId(result.familyId);
        setAnswerMap(result.answers);

        const nextIndex = QUIZ_QUESTIONS.findIndex((question) => !result.answers.has(question.id));
        setActiveIndex(nextIndex >= 0 ? nextIndex : 0);
      } catch (initError) {
        setError(getGermanFirebaseError(initError));
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [user]);

  const question = QUIZ_QUESTIONS[activeIndex];
  const currentAnswer = answerMap.get(question.id);

  const isComplete = useMemo(
    () => QUIZ_QUESTIONS.every((quizQuestion) => answerMap.has(quizQuestion.id)),
    [answerMap],
  );

  if (!user) {
    return <Redirect href="/anmelden" />;
  }

  const isCurrentComplete = currentAnswer?.doesIt && currentAnswer?.thinksAboutIt;
  const isLastQuestion = activeIndex === QUIZ_QUESTIONS.length - 1;

  const onSelect = async (part: keyof AnswerFields, value: QuizOption) => {
    if (!familyId) {
      setError('Bitte zuerst einer Familie beitreten oder eine Familie erstellen.');
      return;
    }

    const previousAnswer = answerMap.get(question.id);
    const nextAnswer: StoredQuizAnswer = {
      familyId,
      userId: user.uid,
      category: question.category,
      questionId: question.id,
      doesIt: previousAnswer?.doesIt ?? 'unklar',
      thinksAboutIt: previousAnswer?.thinksAboutIt ?? 'unklar',
      [part]: value,
    };

    setIsSaving(true);
    setError(null);

    try {
      await saveQuizAnswer(nextAnswer);
      setAnswerMap((currentMap) => {
        const copy = new Map(currentMap);
        copy.set(question.id, nextAnswer);
        return copy;
      });
    } catch (saveError) {
      setError(getGermanFirebaseError(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fairness-Quiz</Text>

      {isLoading ? (
        <Text style={styles.info}>Lade Antworten ...</Text>
      ) : (
        <>
          <Text style={styles.progress}>
            Frage {activeIndex + 1} von {QUIZ_QUESTIONS.length}
          </Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${((activeIndex + 1) / QUIZ_QUESTIONS.length) * 100}%` }]} />
          </View>

          <Text style={styles.category}>{question.category}</Text>
          <Text style={styles.prompt}>Wer {question.prompt}?</Text>

          {PARTS.map((part) => (
            <View key={part.key} style={styles.partBlock}>
              <Text style={styles.partTitle}>{part.label}</Text>
              <View style={styles.optionGrid}>
                {QUIZ_OPTIONS.map((option) => {
                  const selected = currentAnswer?.[part.key] === option;
                  return (
                    <Pressable
                      key={`${part.key}-${option}`}
                      style={[styles.optionButton, selected && styles.optionButtonSelected]}
                      onPress={() => onSelect(part.key, option)}
                      disabled={isSaving}
                    >
                      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          {error && <Text style={styles.errorText}>Fehler: {error}</Text>}

          {isComplete && <Text style={styles.doneText}>Alle Fragen wurden beantwortet.</Text>}

          <View style={styles.navigationRow}>
            <Pressable
              style={[styles.navButton, activeIndex === 0 && styles.navButtonDisabled]}
              onPress={() => setActiveIndex((current) => Math.max(0, current - 1))}
              disabled={activeIndex === 0 || isSaving}
            >
              <Text style={styles.navText}>Zurück</Text>
            </Pressable>
            <Pressable
              style={[styles.navButton, (!isCurrentComplete || isSaving) && styles.navButtonDisabled]}
              onPress={() => {
                if (isLastQuestion) {
                  router.replace('/startseite');
                  return;
                }
                setActiveIndex((current) => Math.min(QUIZ_QUESTIONS.length - 1, current + 1));
              }}
              disabled={!isCurrentComplete || isSaving}
            >
              <Text style={styles.navText}>{isLastQuestion ? 'Fertig' : 'Weiter'}</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    backgroundColor: '#fff',
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  info: {
    textAlign: 'center',
    marginTop: 30,
  },
  progress: {
    textAlign: 'center',
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    backgroundColor: '#2563eb',
  },
  category: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  prompt: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 8,
  },
  partBlock: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  partTitle: {
    fontWeight: '700',
  },
  optionGrid: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
  },
  optionButtonSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8',
  },
  optionText: {
    color: '#111827',
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#fff',
  },
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  navButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    minWidth: 120,
    paddingVertical: 12,
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  navText: {
    color: '#fff',
    fontWeight: '700',
  },
  errorText: {
    color: '#b91c1c',
    fontWeight: '600',
  },
  doneText: {
    color: '#047857',
    fontWeight: '700',
    textAlign: 'center',
  },
});
