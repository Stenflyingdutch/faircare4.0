import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { QUIZ_QUESTIONS, type QuizCategory, type QuizOption, type SatisfactionOption } from '@/lib/quizQuestions';
import { collectionNames, getCurrentUserFamilyId } from '@/services/familyService';
import type { StoredQuizAnswer } from '@/services/quizService';

type UserScores = {
  taskLoadScore: number;
  mentalLoadScore: number;
  satisfactionScore: number;
};

export type ResultUserProfile = {
  userId: string;
  displayName: string;
};

export type ResultQuestionScore = {
  questionId: string;
  category: QuizCategory;
  prompt: string;
  mismatchScore: number;
  dissatisfactionScore: number;
  conflictScore: number;
  doesIt: Record<string, QuizOption>;
  thinksAboutIt: Record<string, QuizOption>;
  satisfaction: Record<string, SatisfactionOption>;
};

export type ResultDocument = {
  familyId: string;
  createdAt: Timestamp;
  userIds: string[];
  scoresPerUser: Record<string, UserScores>;
  mismatchQuestions: ResultQuestionScore[];
  conflictQuestions: ResultQuestionScore[];
  topConflictCategories: { category: QuizCategory; score: number }[];
};

type InProgressResult = Omit<ResultDocument, 'createdAt'>;

function toPercent(value: number) {
  return Math.round(value * 1000) / 10;
}

function normalizeSatisfaction(option: SatisfactionOption) {
  if (option === 'happy') {
    return 1;
  }

  if (option === 'neutral') {
    return 0.5;
  }

  return 0;
}

function dissatisfactionValue(option: SatisfactionOption) {
  if (option === 'unhappy') {
    return 1;
  }

  if (option === 'neutral') {
    return 0.5;
  }

  return 0;
}

function optionToShare(option: QuizOption, responderId: string, partnerId: string): Record<string, number> {
  if (option === 'ich') {
    return { [responderId]: 1, [partnerId]: 0 };
  }

  if (option === 'eher_ich') {
    return { [responderId]: 0.75, [partnerId]: 0.25 };
  }

  if (option === 'beide') {
    return { [responderId]: 0.5, [partnerId]: 0.5 };
  }

  if (option === 'eher_partner') {
    return { [responderId]: 0.25, [partnerId]: 0.75 };
  }

  return { [responderId]: 0, [partnerId]: 1 };
}

function normalizedDistance(first: Record<string, number>, second: Record<string, number>, userIds: string[]) {
  const sum = userIds.reduce((acc, userId) => acc + Math.abs((first[userId] ?? 0) - (second[userId] ?? 0)), 0);
  return sum / 2;
}

function ensureQuestionMap(answers: StoredQuizAnswer[]) {
  const map = new Map<QuizCategory, Map<string, Map<string, StoredQuizAnswer>>>();

  answers.forEach((answer) => {
    const byCategory = map.get(answer.category) ?? new Map<string, Map<string, StoredQuizAnswer>>();
    const byQuestion = byCategory.get(answer.questionId) ?? new Map<string, StoredQuizAnswer>();
    byQuestion.set(answer.userId, answer);
    byCategory.set(answer.questionId, byQuestion);
    map.set(answer.category, byCategory);
  });

  return map;
}

async function loadParentProfiles(userIds: string[]): Promise<ResultUserProfile[]> {
  const userProfiles = await Promise.all(
    userIds.map(async (userId) => {
      const snapshot = await getDoc(doc(db, collectionNames.users, userId));
      const data = snapshot.data();
      return {
        userId,
        displayName: (data?.displayName as string | undefined) ?? (data?.email as string | undefined) ?? 'Elternteil',
      };
    }),
  );

  return userProfiles;
}

async function calculateResultsForFamily(familyId: string, parentIds: [string, string]) {
  const answerSnapshot = await getDocs(
    query(collection(db, collectionNames.quizAnswers), where('familyId', '==', familyId)),
  );

  const answers = answerSnapshot.docs
    .map((docSnapshot) => docSnapshot.data() as StoredQuizAnswer)
    .filter((answer) => parentIds.includes(answer.userId));

  const questionMap = ensureQuestionMap(answers);
  const [firstParentId, secondParentId] = parentIds;

  const taskPoints: Record<string, number> = { [firstParentId]: 0, [secondParentId]: 0 };
  const mentalPoints: Record<string, number> = { [firstParentId]: 0, [secondParentId]: 0 };
  const satisfactionPoints: Record<string, number> = { [firstParentId]: 0, [secondParentId]: 0 };
  const answeredQuestionsByUser: Record<string, number> = { [firstParentId]: 0, [secondParentId]: 0 };

  const mismatchQuestions: ResultQuestionScore[] = [];
  const conflictQuestions: ResultQuestionScore[] = [];
  const categoryConflictScores = new Map<QuizCategory, number[]>();

  for (const question of QUIZ_QUESTIONS) {
    const answersInCategory = questionMap.get(question.category);
    const answersByUser = answersInCategory?.get(question.id);

    if (!answersByUser || answersByUser.size < 2) {
      continue;
    }

    const firstAnswer = answersByUser.get(firstParentId);
    const secondAnswer = answersByUser.get(secondParentId);

    if (!firstAnswer || !secondAnswer) {
      continue;
    }

    const firstDoesShare = optionToShare(firstAnswer.doesIt, firstParentId, secondParentId);
    const secondDoesShare = optionToShare(secondAnswer.doesIt, secondParentId, firstParentId);
    const firstThinkShare = optionToShare(firstAnswer.thinksAboutIt, firstParentId, secondParentId);
    const secondThinkShare = optionToShare(secondAnswer.thinksAboutIt, secondParentId, firstParentId);

    taskPoints[firstParentId] += (firstDoesShare[firstParentId] + secondDoesShare[firstParentId]) / 2;
    taskPoints[secondParentId] += (firstDoesShare[secondParentId] + secondDoesShare[secondParentId]) / 2;
    mentalPoints[firstParentId] += (firstThinkShare[firstParentId] + secondThinkShare[firstParentId]) / 2;
    mentalPoints[secondParentId] += (firstThinkShare[secondParentId] + secondThinkShare[secondParentId]) / 2;

    satisfactionPoints[firstParentId] += normalizeSatisfaction(firstAnswer.satisfaction);
    satisfactionPoints[secondParentId] += normalizeSatisfaction(secondAnswer.satisfaction);
    answeredQuestionsByUser[firstParentId] += 1;
    answeredQuestionsByUser[secondParentId] += 1;

    const doesMismatch = normalizedDistance(firstDoesShare, secondDoesShare, parentIds);
    const thinksMismatch = normalizedDistance(firstThinkShare, secondThinkShare, parentIds);
    const mismatchScore = Math.round((doesMismatch + thinksMismatch) * 100) / 100;

    const dissatisfactionScore =
      Math.round(
        ((dissatisfactionValue(firstAnswer.satisfaction) + dissatisfactionValue(secondAnswer.satisfaction)) / 2) * 100,
      ) / 100;

    const conflictScore = Math.round((mismatchScore + dissatisfactionScore) * 100) / 100;

    const questionScore: ResultQuestionScore = {
      questionId: question.id,
      category: question.category,
      prompt: question.question,
      mismatchScore,
      dissatisfactionScore,
      conflictScore,
      doesIt: {
        [firstParentId]: firstAnswer.doesIt,
        [secondParentId]: secondAnswer.doesIt,
      },
      thinksAboutIt: {
        [firstParentId]: firstAnswer.thinksAboutIt,
        [secondParentId]: secondAnswer.thinksAboutIt,
      },
      satisfaction: {
        [firstParentId]: firstAnswer.satisfaction,
        [secondParentId]: secondAnswer.satisfaction,
      },
    };

    mismatchQuestions.push(questionScore);
    conflictQuestions.push(questionScore);

    const currentCategoryScores = categoryConflictScores.get(question.category) ?? [];
    currentCategoryScores.push(conflictScore);
    categoryConflictScores.set(question.category, currentCategoryScores);
  }

  const maxPoints = Math.max(conflictQuestions.length, 1);

  const scoresPerUser: Record<string, UserScores> = {
    [firstParentId]: {
      taskLoadScore: toPercent(taskPoints[firstParentId] / maxPoints),
      mentalLoadScore: toPercent(mentalPoints[firstParentId] / maxPoints),
      satisfactionScore: toPercent(satisfactionPoints[firstParentId] / Math.max(answeredQuestionsByUser[firstParentId], 1)),
    },
    [secondParentId]: {
      taskLoadScore: toPercent(taskPoints[secondParentId] / maxPoints),
      mentalLoadScore: toPercent(mentalPoints[secondParentId] / maxPoints),
      satisfactionScore: toPercent(
        satisfactionPoints[secondParentId] / Math.max(answeredQuestionsByUser[secondParentId], 1),
      ),
    },
  };

  const sortedMismatchQuestions = [...mismatchQuestions].sort((a, b) => b.mismatchScore - a.mismatchScore);
  const sortedConflictQuestions = [...conflictQuestions].sort((a, b) => b.conflictScore - a.conflictScore);

  const topConflictCategories = [...categoryConflictScores.entries()]
    .map(([category, scores]) => {
      const total = scores.reduce((sum, value) => sum + value, 0);
      return {
        category,
        score: Math.round((total / scores.length) * 100) / 100,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return {
    familyId,
    userIds: parentIds,
    scoresPerUser,
    mismatchQuestions: sortedMismatchQuestions,
    conflictQuestions: sortedConflictQuestions,
    topConflictCategories,
  } satisfies InProgressResult;
}

export async function buildAndStoreFamilyResults(uid: string) {
  const familyId = await getCurrentUserFamilyId(uid);

  if (!familyId) {
    throw new Error('Kein Familienkonto gefunden.');
  }

  const familySnapshot = await getDoc(doc(db, collectionNames.families, familyId));
  const familyData = familySnapshot.data() as { memberIds?: string[] } | undefined;
  const memberIds = familyData?.memberIds ?? [];

  if (memberIds.length < 2) {
    throw new Error('Für Ergebnisse werden zwei Elternteile in derselben Familie benötigt.');
  }

  const parentIds = [memberIds[0], memberIds[1]] as [string, string];
  const computed = await calculateResultsForFamily(familyId, parentIds);

  const resultDocId = `${familyId}_${Date.now()}`;

  await setDoc(doc(db, collectionNames.results, resultDocId), {
    ...computed,
    createdAt: serverTimestamp(),
  });

  const parentProfiles = await loadParentProfiles(parentIds);

  return {
    ...computed,
    parentProfiles,
  };
}
