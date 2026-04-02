import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SoftButton } from '@/components/ui/SoftButton';
import { SectionBlock } from '@/components/ui/SectionBlock';
import { useAuth } from '@/contexts/AuthContext';
import { getGermanFirebaseError } from '@/lib/firebaseError';
import {
  QUIZ_OPTIONS,
  QUIZ_QUESTIONS,
  SATISFACTION_OPTIONS,
  type QuizOption,
  type SatisfactionOption,
} from '@/lib/quizQuestions';
import { theme } from '@/lib/theme';
import { loadQuizAnswersByUser, saveQuizAnswer, type StoredQuizAnswer } from '@/services/quizService';

type AnswerFields = Pick<StoredQuizAnswer, 'doesIt' | 'thinksAboutIt' | 'satisfaction'>;

const SATISFACTION_LABELS: Record<SatisfactionOption, string> = {
  unhappy: 'unzufrieden',
  neutral: 'neutral',
  happy: 'zufrieden',
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
  const completionOpacity = useRef(new Animated.Value(0)).current;

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
        setError('Verbindung gerade nicht verfügbar. Bitte später erneut versuchen.');
        console.error(getGermanFirebaseError(initError));
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

  useEffect(() => {
    Animated.timing(completionOpacity, {
      toValue: isComplete ? 1 : 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [completionOpacity, isComplete]);

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
      setError('Verbindung gerade nicht verfügbar. Bitte später erneut versuchen.');
      console.error(getGermanFirebaseError(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Gemeinsam anschauen</Text>
      <Text style={styles.subtitle}>Es geht um dein Gefühl, nicht um Perfektion.</Text>

      {isLoading ? (
        <Text style={styles.info}>Lade Antworten ...</Text>
      ) : (
        <>
          <Text style={styles.progress}>Frage {activeIndex + 1} von {QUIZ_QUESTIONS.length}</Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${((activeIndex + 1) / QUIZ_QUESTIONS.length) * 100}%` }]} />
          </View>

          <SectionBlock title={question.category} subtitle={question.question}>
            <View style={styles.partBlock}>
              <Text style={styles.partTitle}>Denken</Text>
              <Text style={styles.examplesText}>Beispiele: {question.thinkingActions.join(' · ')}</Text>
              <View style={styles.optionGrid}>
                {QUIZ_OPTIONS.map((option) => {
                  const selected = currentAnswer?.thinksAboutIt === option;
                  return (
                    <SoftButton
                      key={`thinks-${option}`}
                      label={option}
                      variant={selected ? 'primary' : 'neutral'}
                      onPress={() => onSelect('thinksAboutIt', option)}
                      disabled={isSaving}
                      style={styles.optionButton}
                    />
                  );
                })}
              </View>
            </View>

            <View style={styles.partBlock}>
              <Text style={styles.partTitle}>Machen</Text>
              <Text style={styles.examplesText}>Beispiele: {question.doingActions.join(' · ')}</Text>
              <View style={styles.optionGrid}>
                {QUIZ_OPTIONS.map((option) => {
                  const selected = currentAnswer?.doesIt === option;
                  return (
                    <SoftButton
                      key={`does-${option}`}
                      label={option}
                      variant={selected ? 'primary' : 'neutral'}
                      onPress={() => onSelect('doesIt', option)}
                      disabled={isSaving}
                      style={styles.optionButton}
                    />
                  );
                })}
              </View>
            </View>

            <View style={styles.partBlock}>
              <Text style={styles.partTitle}>Wie fühlt sich das an?</Text>
              <View style={styles.optionGrid}>
                {SATISFACTION_OPTIONS.map((option) => {
                  const selected = currentAnswer?.satisfaction === option;
                  return (
                    <SoftButton
                      key={`satisfaction-${option}`}
                      label={SATISFACTION_LABELS[option]}
                      variant={selected ? 'secondary' : 'neutral'}
                      onPress={() => onSelect('satisfaction', option)}
                      disabled={isSaving}
                      style={styles.optionButton}
                    />
                  );
                })}
              </View>
            </View>
          </SectionBlock>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Animated.View style={{ opacity: completionOpacity }}>
            {isComplete ? <Text style={styles.doneText}>Alles ist eingetragen. Ihr könnt später weiter sprechen.</Text> : null}
          </Animated.View>

          <View style={styles.navigationRow}>
            <SoftButton
              label="Zurück"
              variant="neutral"
              onPress={() => setActiveIndex((current) => Math.max(0, current - 1))}
              disabled={activeIndex === 0 || isSaving}
              style={styles.navButton}
            />
            <SoftButton
              label={isLastQuestion ? 'Fertig' : 'Weiter'}
              onPress={() => {
                if (isLastQuestion) {
                  router.replace('/startseite');
                  return;
                }
                setActiveIndex((current) => Math.min(QUIZ_QUESTIONS.length - 1, current + 1));
              }}
              disabled={!isCurrentComplete || isSaving}
              style={styles.navButton}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    gap: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.title,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.typography.lineHeightBody,
  },
  info: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xl,
  },
  progress: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: theme.colors.neutral,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    backgroundColor: theme.colors.primary,
  },
  partBlock: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: '#EDF0F5',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    backgroundColor: '#FCFCFD',
  },
  partTitle: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
  examplesText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  optionButton: {
    minWidth: 100,
  },
  errorText: {
    color: '#A35B56',
    textAlign: 'center',
    lineHeight: 22,
  },
  doneText: {
    color: '#397A58',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 22,
  },
  navigationRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  navButton: {
    flex: 1,
  },
});
