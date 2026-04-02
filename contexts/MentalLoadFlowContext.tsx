import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { buildQuestionsForAgeGroups, type AgeGroup, type MentalLoadQuestion } from '@/lib/mentalLoadQuestions';
import {
  buildSharedResult,
  calculateIndividualResult,
  createEmptyIndividualResult,
  type CategoryScore,
  type SharedResultView,
} from '@/lib/resultLogic';

export type MentalLoadAnswerValue = 'ich' | 'eher_ich' | 'beide' | 'eher_partner' | 'partner';

export type MentalLoadAnswer = {
  questionId: string;
  category: string;
  answer: MentalLoadAnswerValue;
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
  status: 'offen' | 'aktiv' | 'pausiert';
  goal: string | null;
  details: string;
};

export type WeeklyReviewAnswer = {
  positives: string[];
  challenges: string[];
  changes: string[];
};

export type SetupStatus = {
  hatQuizAbgeschlossen: boolean;
  istRegistriert: boolean;
  hatIndividuellesErgebnis: boolean;
  partnerVerbunden: boolean;
  partnerHatQuizAbgeschlossen: boolean;
  gemeinsamesErgebnisVerfuegbar: boolean;
  zieleFestgelegt: boolean;
  aufgabenZugeordnet: boolean;
  setupAbgeschlossen: boolean;
};

export type MentalLoadSession = {
  anonymousQuizSession: {
    id: string;
    childrenCount: number;
    childrenAgeGroups: AgeGroup[];
    initiatorAnswers: MentalLoadAnswer[];
    partnerAnswers: MentalLoadAnswer[];
    initiatorQuizCompleted: boolean;
    partnerQuizCompleted: boolean;
  };
  initiatorUser: { id: string; displayName: string; email: string } | null;
  partnerUser: { id: string; displayName: string; email: string } | null;
  pairOrHouseholdContext: { id: string; inviteToken: string; inviteStatus: InviteStatus };
  goals: GoalOption[];
  goalStatus: 'not_started' | 'in_progress' | 'done';
  tasks: TaskItem[];
  weeklyReview: { lastCompletedAt: string | null; upcomingAt: string | null };
  weeklyReviewAnswers: WeeklyReviewAnswer[];
  setupCompleted: boolean;
  needsQuizRefresh: boolean;
  pendingInviteCode: string | null;
};

function generateInviteCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function normalizeInviteCode(value: string) {
  return value.trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

const defaultSession: MentalLoadSession = {
  anonymousQuizSession: {
    id: `anon_${Date.now()}`,
    childrenCount: 1,
    childrenAgeGroups: [],
    initiatorAnswers: [],
    partnerAnswers: [],
    initiatorQuizCompleted: false,
    partnerQuizCompleted: false,
  },
  initiatorUser: null,
  partnerUser: null,
  pairOrHouseholdContext: {
    id: `household_${Date.now()}`,
    inviteToken: generateInviteCode(),
    inviteStatus: 'pending',
  },
  goals: [],
  goalStatus: 'not_started',
  tasks: [
    { id: 'task_1', title: 'Arzttermine und Gesundheit koordinieren', owner: null, status: 'offen', goal: null, details: '' },
    { id: 'task_2', title: 'Termine mit Kita oder Schule im Blick halten', owner: null, status: 'offen', goal: null, details: '' },
    { id: 'task_3', title: 'Alltagsvorbereitung für die Woche planen', owner: null, status: 'offen', goal: null, details: '' },
  ],
  weeklyReview: {
    lastCompletedAt: null,
    upcomingAt: null,
  },
  weeklyReviewAnswers: [],
  setupCompleted: false,
  needsQuizRefresh: false,
  pendingInviteCode: null,
};

type ContextValue = {
  session: MentalLoadSession;
  setupStatus: SetupStatus;
  nextSetupRoute: '/quiz-intro' | '/registrieren' | '/eigenes-ergebnis' | '/partner-einladen' | '/gemeinsames-ergebnis' | '/ziele-auswahl' | '/aufgaben';
  questions: MentalLoadQuestion[];
  initiatorResult: { totalScore: number; categoryScores: CategoryScore[]; summaryBullets: string[] };
  partnerResult: { totalScore: number; categoryScores: CategoryScore[]; summaryBullets: string[] };
  sharedResult: SharedResultView | null;
  setChildrenCount: (count: number) => void;
  setAgeGroups: (groups: AgeGroup[]) => void;
  saveAnswer: (role: 'initiator' | 'partner', answer: MentalLoadAnswer) => void;
  completeQuiz: (role: 'initiator' | 'partner') => void;
  saveInitiatorUser: (profile: { id: string; displayName: string; email: string }) => void;
  savePartnerUser: (profile: { id: string; displayName: string; email: string }) => void;
  claimInvite: (token: string) => boolean;
  getInviteCode: () => string;
  setInviteCode: (code: string) => void;
  setPendingInviteCode: (code: string | null) => void;
  setGoals: (goals: GoalOption[]) => void;
  addGoal: (goal: string) => void;
  updateGoal: (index: number, goal: string) => void;
  removeGoal: (index: number) => void;
  setTaskOwner: (taskId: string, owner: TaskItem['owner']) => void;
  updateTask: (taskId: string, patch: Partial<Omit<TaskItem, 'id'>>) => void;
  removeTask: (taskId: string) => void;
  addTask: (title: string, owner?: TaskItem['owner']) => void;
  hydrateAnswers: (role: 'initiator' | 'partner', answers: MentalLoadAnswer[], quizCompleted?: boolean) => void;
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

  const initiatorResult = useMemo(
    () =>
      session.anonymousQuizSession.initiatorAnswers.length
        ? calculateIndividualResult(session.anonymousQuizSession.initiatorAnswers)
        : createEmptyIndividualResult(),
    [session.anonymousQuizSession.initiatorAnswers],
  );

  const partnerResult = useMemo(
    () =>
      session.anonymousQuizSession.partnerAnswers.length
        ? calculateIndividualResult(session.anonymousQuizSession.partnerAnswers)
        : createEmptyIndividualResult(),
    [session.anonymousQuizSession.partnerAnswers],
  );

  const sharedResult = useMemo(() => {
    if (!session.anonymousQuizSession.initiatorQuizCompleted || !session.anonymousQuizSession.partnerQuizCompleted) {
      return null;
    }
    return buildSharedResult(session.anonymousQuizSession.initiatorAnswers, session.anonymousQuizSession.partnerAnswers);
  }, [session.anonymousQuizSession]);

  const setupStatus = useMemo<SetupStatus>(() => {
    const hatQuizAbgeschlossen = session.anonymousQuizSession.initiatorQuizCompleted;
    const istRegistriert = Boolean(session.initiatorUser);
    const hatIndividuellesErgebnis = session.anonymousQuizSession.initiatorAnswers.length > 0;
    const partnerVerbunden =
      session.pairOrHouseholdContext.inviteStatus === 'accepted' ||
      session.pairOrHouseholdContext.inviteStatus === 'completed' ||
      Boolean(session.partnerUser);
    const partnerHatQuizAbgeschlossen = session.anonymousQuizSession.partnerQuizCompleted;
    const gemeinsamesErgebnisVerfuegbar = Boolean(sharedResult);
    const zieleFestgelegt = session.goals.length > 0;
    const aufgabenZugeordnet = session.tasks.every((task) => task.owner !== null);

    return {
      hatQuizAbgeschlossen,
      istRegistriert,
      hatIndividuellesErgebnis,
      partnerVerbunden,
      partnerHatQuizAbgeschlossen,
      gemeinsamesErgebnisVerfuegbar,
      zieleFestgelegt,
      aufgabenZugeordnet,
      setupAbgeschlossen:
        hatQuizAbgeschlossen &&
        istRegistriert &&
        hatIndividuellesErgebnis &&
        partnerVerbunden &&
        partnerHatQuizAbgeschlossen &&
        gemeinsamesErgebnisVerfuegbar &&
        zieleFestgelegt &&
        aufgabenZugeordnet,
    };
  }, [session, sharedResult]);

  const nextSetupRoute = useMemo<ContextValue['nextSetupRoute']>(() => {
    if (!setupStatus.hatQuizAbgeschlossen) {
      return '/quiz-intro';
    }
    if (!setupStatus.istRegistriert) {
      return '/registrieren';
    }
    if (!setupStatus.hatIndividuellesErgebnis) {
      return '/eigenes-ergebnis';
    }
    if (!setupStatus.partnerVerbunden) {
      return '/partner-einladen';
    }
    if (!setupStatus.gemeinsamesErgebnisVerfuegbar) {
      return '/gemeinsames-ergebnis';
    }
    if (!setupStatus.zieleFestgelegt) {
      return '/ziele-auswahl';
    }
    return '/aufgaben';
  }, [setupStatus]);

  const value = useMemo<ContextValue>(
    () => ({
      session,
      setupStatus,
      nextSetupRoute,
      questions,
      initiatorResult,
      partnerResult,
      sharedResult,
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
          needsQuizRefresh: prev.setupCompleted ? true : prev.needsQuizRefresh,
        }));
      },
      saveAnswer: (role, answer) => {
        setSession((prev) => {
          const key = role === 'initiator' ? 'initiatorAnswers' : 'partnerAnswers';
          const currentAnswers = prev.anonymousQuizSession[key];
          const filtered = currentAnswers.filter((item) => item.questionId !== answer.questionId);
          return {
            ...prev,
            anonymousQuizSession: {
              ...prev.anonymousQuizSession,
              [key]: [...filtered, answer],
            },
          };
        });
      },
      completeQuiz: (role) => {
        setSession((prev) => ({
          ...prev,
          anonymousQuizSession: {
            ...prev.anonymousQuizSession,
            initiatorQuizCompleted: role === 'initiator' ? true : prev.anonymousQuizSession.initiatorQuizCompleted,
            partnerQuizCompleted: role === 'partner' ? true : prev.anonymousQuizSession.partnerQuizCompleted,
          },
          pairOrHouseholdContext: {
            ...prev.pairOrHouseholdContext,
            inviteStatus: role === 'partner' ? 'completed' : prev.pairOrHouseholdContext.inviteStatus,
          },
          needsQuizRefresh: role === 'initiator' ? false : prev.needsQuizRefresh,
        }));
      },
      saveInitiatorUser: (profile) => setSession((prev) => ({ ...prev, initiatorUser: profile })),
      savePartnerUser: (profile) =>
        setSession((prev) => ({
          ...prev,
          partnerUser: profile,
          pairOrHouseholdContext: { ...prev.pairOrHouseholdContext, inviteStatus: 'accepted' },
        })),
      claimInvite: (token) => {
        const valid = normalizeInviteCode(token) === normalizeInviteCode(session.pairOrHouseholdContext.inviteToken);
        if (valid) {
          setSession((prev) => ({
            ...prev,
            pairOrHouseholdContext: { ...prev.pairOrHouseholdContext, inviteStatus: 'accepted' },
          }));
        }
        return valid;
      },
      getInviteCode: () => session.pairOrHouseholdContext.inviteToken,
      setInviteCode: (code) =>
        setSession((prev) => ({
          ...prev,
          pairOrHouseholdContext: { ...prev.pairOrHouseholdContext, inviteToken: code, inviteStatus: 'pending' },
        })),
      setPendingInviteCode: (code) => setSession((prev) => ({ ...prev, pendingInviteCode: code })),
      setGoals: (goals) => setSession((prev) => ({ ...prev, goals, goalStatus: 'in_progress' })),
      addGoal: (goal) =>
        setSession((prev) => ({ ...prev, goals: [...prev.goals, goal as GoalOption], goalStatus: 'in_progress' })),
      updateGoal: (index, goal) =>
        setSession((prev) => ({
          ...prev,
          goals: prev.goals.map((item, current) => (current === index ? (goal as GoalOption) : item)),
        })),
      removeGoal: (index) =>
        setSession((prev) => ({ ...prev, goals: prev.goals.filter((_, current) => current !== index) })),
      setTaskOwner: (taskId, owner) =>
        setSession((prev) => ({
          ...prev,
          tasks: prev.tasks.map((task) => (task.id === taskId ? { ...task, owner, status: owner ? 'aktiv' : task.status } : task)),
        })),
      updateTask: (taskId, patch) =>
        setSession((prev) => ({
          ...prev,
          tasks: prev.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
        })),
      removeTask: (taskId) =>
        setSession((prev) => ({
          ...prev,
          tasks: prev.tasks.filter((task) => task.id !== taskId),
        })),
      addTask: (title, owner = null) =>
        setSession((prev) => ({
          ...prev,
          tasks: [
            ...prev.tasks,
            {
              id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              title: title.trim(),
              owner,
              status: owner ? 'aktiv' : 'offen',
              goal: prev.goals[0] ?? null,
              details: '',
            },
          ],
        })),
      hydrateAnswers: (role, answers, quizCompleted = false) =>
        setSession((prev) => ({
          ...prev,
          anonymousQuizSession: {
            ...prev.anonymousQuizSession,
            initiatorAnswers: role === 'initiator' ? answers : prev.anonymousQuizSession.initiatorAnswers,
            partnerAnswers: role === 'partner' ? answers : prev.anonymousQuizSession.partnerAnswers,
            initiatorQuizCompleted:
              role === 'initiator' ? quizCompleted || prev.anonymousQuizSession.initiatorQuizCompleted : prev.anonymousQuizSession.initiatorQuizCompleted,
            partnerQuizCompleted:
              role === 'partner' ? quizCompleted || prev.anonymousQuizSession.partnerQuizCompleted : prev.anonymousQuizSession.partnerQuizCompleted,
          },
        })),
      completeSetup: () => setSession((prev) => ({ ...prev, goalStatus: 'done', setupCompleted: true })),
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
    [initiatorResult, nextSetupRoute, partnerResult, questions, session, setupStatus, sharedResult],
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
