import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { buildQuestionsForAgeGroups, type AgeGroup, type MentalLoadQuestion } from '@/lib/mentalLoadQuestions';

export type MentalLoadAnswer = {
  questionId: string;
  category: string;
  answer: 'ich' | 'fifty' | 'partner';
  stress?: number;
};

export type InviteStatus = 'pending' | 'accepted' | 'completed';

export type GoalOption =
  | 'Weniger für alles mitdenken müssen'
  | 'Klare Verantwortlichkeiten im Alltag'
  | 'Weniger Rückfragen und Erinnerungen'
  | 'Routinen stabil und planbar'
  | 'Bessere Vorbereitung im Alltag';

export type TaskItem = {
  id: string;
  title: string;
  owner: 'initiator' | 'partner' | null;
};

export type WeeklyReviewAnswer = {
  positives: string[];
  challenges: string[];
  changes: string[];
};

export type MentalLoadSession = {
  anonymousQuizSession: {
    id: string;
    childrenCount: number;
    childrenAgeGroups: AgeGroup[];
    answers: MentalLoadAnswer[];
    completed: boolean;
  };
  initiatorUser: { id: string; displayName: string; email: string } | null;
  partnerUser: { id: string; displayName: string; email: string } | null;
  pairOrHouseholdContext: { id: string; inviteToken: string; inviteStatus: InviteStatus };
  goals: GoalOption[];
  goalStatus: 'not_started' | 'in_progress' | 'done';
  tasks: TaskItem[];
  weeklyReview: { lastCompletedAt: string | null; upcomingAt: string | null };
  weeklyReviewAnswers: WeeklyReviewAnswer[];
  notificationState: { partnerCompleted: boolean };
};

const defaultSession: MentalLoadSession = {
  anonymousQuizSession: {
    id: `anon_${Date.now()}`,
    childrenCount: 1,
    childrenAgeGroups: [],
    answers: [],
    completed: false,
  },
  initiatorUser: null,
  partnerUser: null,
  pairOrHouseholdContext: {
    id: `household_${Date.now()}`,
    inviteToken: `invite_${Math.random().toString(36).slice(2, 10)}`,
    inviteStatus: 'pending',
  },
  goals: [],
  goalStatus: 'not_started',
  tasks: [
    { id: 'task_1', title: 'Arzttermine im Blick halten', owner: null },
    { id: 'task_2', title: 'Kita-/Schul-Organisation koordinieren', owner: null },
    { id: 'task_3', title: 'Wochenplanung für Mahlzeiten', owner: null },
  ],
  weeklyReview: {
    lastCompletedAt: null,
    upcomingAt: null,
  },
  weeklyReviewAnswers: [],
  notificationState: {
    partnerCompleted: false,
  },
};

type ContextValue = {
  session: MentalLoadSession;
  questions: MentalLoadQuestion[];
  setChildrenCount: (count: number) => void;
  setAgeGroups: (groups: AgeGroup[]) => void;
  saveAnswer: (answer: MentalLoadAnswer) => void;
  completeQuiz: () => void;
  saveInitiatorUser: (profile: { id: string; displayName: string; email: string }) => void;
  savePartnerUser: (profile: { id: string; displayName: string; email: string }) => void;
  claimInvite: () => void;
  completePartnerFlow: () => void;
  setGoals: (goals: GoalOption[]) => void;
  setTaskOwner: (taskId: string, owner: TaskItem['owner']) => void;
  completeSetup: () => void;
  saveWeeklyReview: (payload: WeeklyReviewAnswer) => void;
};

const MentalLoadFlowContext = createContext<ContextValue | undefined>(undefined);

export function MentalLoadFlowProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<MentalLoadSession>(defaultSession);

  const questions = useMemo(
    () => buildQuestionsForAgeGroups(session.anonymousQuizSession.childrenAgeGroups),
    [session.anonymousQuizSession.childrenAgeGroups],
  );

  const value = useMemo<ContextValue>(
    () => ({
      session,
      questions,
      setChildrenCount: (count) => {
        setSession((prev) => ({
          ...prev,
          anonymousQuizSession: { ...prev.anonymousQuizSession, childrenCount: count },
        }));
      },
      setAgeGroups: (groups) => {
        setSession((prev) => ({
          ...prev,
          anonymousQuizSession: { ...prev.anonymousQuizSession, childrenAgeGroups: groups },
        }));
      },
      saveAnswer: (answer) => {
        setSession((prev) => {
          const filtered = prev.anonymousQuizSession.answers.filter((item) => item.questionId !== answer.questionId);
          return {
            ...prev,
            anonymousQuizSession: {
              ...prev.anonymousQuizSession,
              answers: [...filtered, answer],
            },
          };
        });
      },
      completeQuiz: () => {
        setSession((prev) => ({
          ...prev,
          anonymousQuizSession: { ...prev.anonymousQuizSession, completed: true },
        }));
      },
      saveInitiatorUser: (profile) => setSession((prev) => ({ ...prev, initiatorUser: profile })),
      savePartnerUser: (profile) => setSession((prev) => ({ ...prev, partnerUser: profile })),
      claimInvite: () =>
        setSession((prev) => ({
          ...prev,
          pairOrHouseholdContext: { ...prev.pairOrHouseholdContext, inviteStatus: 'accepted' },
        })),
      completePartnerFlow: () =>
        setSession((prev) => ({
          ...prev,
          pairOrHouseholdContext: { ...prev.pairOrHouseholdContext, inviteStatus: 'completed' },
          notificationState: { partnerCompleted: true },
        })),
      setGoals: (goals) => setSession((prev) => ({ ...prev, goals, goalStatus: 'in_progress' })),
      setTaskOwner: (taskId, owner) =>
        setSession((prev) => ({
          ...prev,
          tasks: prev.tasks.map((task) => (task.id === taskId ? { ...task, owner } : task)),
        })),
      completeSetup: () => setSession((prev) => ({ ...prev, goalStatus: 'done' })),
      saveWeeklyReview: (payload) =>
        setSession((prev) => ({
          ...prev,
          weeklyReviewAnswers: [...prev.weeklyReviewAnswers, payload],
          weeklyReview: {
            lastCompletedAt: new Date().toISOString(),
            upcomingAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        })),
    }),
    [questions, session],
  );

  return <MentalLoadFlowContext.Provider value={value}>{children}</MentalLoadFlowContext.Provider>;
}

export function useMentalLoadFlow() {
  const context = useContext(MentalLoadFlowContext);
  if (!context) {
    throw new Error('useMentalLoadFlow muss innerhalb von MentalLoadFlowProvider verwendet werden.');
  }
  return context;
}
