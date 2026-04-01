import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getGermanFirebaseError } from '@/lib/firebaseError';
import {
  QUIZ_OPTIONS,
  QUIZ_QUESTIONS,
  SATISFACTION_OPTIONS,
  type QuizOption,
  type SatisfactionOption,
} from '@/lib/quizQuestions';
import { loadQuizAnswersByUser, saveQuizAnswer, type StoredQuizAnswer } from '@/services/quizService';

type AnswerFields = Pick<StoredQuizAnswer, 'doesIt' | 'thinksAboutIt' | 'satisfaction'>;

const OWNERSHIP_OPTIONS_LABEL = 'ich • partner • beide • unklar';

const SATISFACTION_LABELS: Record<SatisfactionOption, string> = {
  unhappy: '😞',
  neutral: '😐',
  happy: '🙂',
};

function isAnswerComplete(answer: StoredQuizAnswer | undefined) {
  return Boolean(answer?.doesIt && answer?.thinksAboutIt && answer?.satisfaction);
}

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

        const nextIndex = QUIZ_QUESTIONS.findIndex((quizQuestion) => !isAnswerComplete(result.answers.get(quizQuestion.id)));
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
    () => QUIZ_QUESTIONS.every((quizQuestion) => isAnswerComplete(answerMap.get(quizQuestion.id))),
    [answerMap],
  );

  if (!user) {
    return <Redirect href="/anmelden" />;
  }

  const isCurrentComplete = isAnswerComplete(currentAnswer);
  const isLastQuestion = activeIndex === QUIZ_QUESTIONS.length - 1;

  const onSelect = async (part: keyof AnswerFields, value: QuizOption | SatisfactionOption) => {
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
      satisfaction: previousAnswer?.satisfaction ?? 'neutral',
      [part]: value,
    } as StoredQuizAnswer;

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
          <Text style={styles.question}>{question.question}</Text>

          <View style={styles.partBlock}>
            <Text style={styles.partTitle}>Dran denken</Text>
            <Text style={styles.helperText}>
              (Beispiele: {question.thinkingActions.join(' · ')})
            </Text>
            <Text style={styles.helperText}>Auswahl: {OWNERSHIP_OPTIONS_LABEL}</Text>
            <View style={styles.optionGrid}>
              {QUIZ_OPTIONS.map((option) => {
                const selected = currentAnswer?.thinksAboutIt === option;
                return (
                  <Pressable
                    key={`thinksAboutIt-${option}`}
                    style={[styles.optionButton, selected && styles.optionButtonSelected]}
                    onPress={() => onSelect('thinksAboutIt', option)}
                    disabled={isSaving}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.partBlock}>
            <Text style={styles.partTitle}>Machen</Text>
            <Text style={styles.helperText}>
              (Beispiele: {question.doingActions.join(' · ')})
            </Text>
            <Text style={styles.helperText}>Auswahl: {OWNERSHIP_OPTIONS_LABEL}</Text>
            <View style={styles.optionGrid}>
              {QUIZ_OPTIONS.map((option) => {
                const selected = currentAnswer?.doesIt === option;
                return (
                  <Pressable
                    key={`doesIt-${option}`}
                    style={[styles.optionButton, selected && styles.optionButtonSelected]}
                    onPress={() => onSelect('doesIt', option)}
                    disabled={isSaving}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.partBlock}>
            <Text style={styles.partTitle}>Wie zufrieden bist du (am Ende)</Text>
            <View style={styles.optionGrid}>
              {SATISFACTION_OPTIONS.map((option) => {
                const selected = currentAnswer?.satisfaction === option;
                return (
                  <Pressable
                    key={`satisfaction-${option}`}
                    style={[styles.optionButton, selected && styles.optionButtonSelected]}
                    onPress={() => onSelect('satisfaction', option)}
                    disabled={isSaving}
                  >
                    <Text style={[styles.smileyText, selected && styles.optionTextSelected]}>{SATISFACTION_LABELS[option]}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

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
  question: {
    fontSize: 18,
    fontWeight: '600',
  },
  definitionBlock: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    gap: 4,
    backgroundColor: '#f8fafc',
  },
  definitionTitle: {
    fontWeight: '700',
  },
  helperText: {
    fontSize: 14,
    color: '#334155',
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
  smileyText: {
    fontSize: 24,
    lineHeight: 28,
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
