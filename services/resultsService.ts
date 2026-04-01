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
import { QUIZ_QUESTIONS, type QuizCategory, type QuizOption } from '@/lib/quizQuestions';
import { collectionNames, getCurrentUserFamilyId } from '@/services/familyService';
import type { StoredQuizAnswer } from '@/services/quizService';

type UserScores = {
  taskLoadScore: number;
  mentalLoadScore: number;
  responsibilityScore: number;
};

export type ResultUserProfile = {
  userId: string;
  displayName: string;
};

export type MismatchQuestion = {
  questionId: string;
  category: QuizCategory;
  prompt: string;
  mismatchScore: number;
};

export type ResultDocument = {
  familyId: string;
  createdAt: Timestamp;
  userIds: string[];
  scoresPerUser: Record<string, UserScores>;
  mismatchQuestions: MismatchQuestion[];
  topConflictCategories: { category: QuizCategory; score: number }[];
};

type InProgressResult = Omit<ResultDocument, 'createdAt'>;

function toPercent(value: number) {
  return Math.round(value * 1000) / 10;
}

function mergeShare(target: Record<string, number>, userId: string, value: number) {
  target[userId] = (target[userId] ?? 0) + value;
}

function optionToShare(
  option: QuizOption,
  responderId: string,
  partnerId: string,
): Record<string, number> {
  const shares: Record<string, number> = { [responderId]: 0, [partnerId]: 0 };

  if (option === 'ich') {
    mergeShare(shares, responderId, 1);
  } else if (option === 'partner') {
    mergeShare(shares, partnerId, 1);
  } else if (option === 'beide') {
    mergeShare(shares, responderId, 0.5);
    mergeShare(shares, partnerId, 0.5);
  } else {
    mergeShare(shares, responderId, 0.5);
    mergeShare(shares, partnerId, 0.5);
  }

  return shares;
}

function normalizedDistance(first: Record<string, number>, second: Record<string, number>, userIds: string[]) {
  const sum = userIds.reduce((acc, userId) => acc + Math.abs((first[userId] ?? 0) - (second[userId] ?? 0)), 0);
  return sum / 2;
}

function ensureQuestionMap(answers: StoredQuizAnswer[]) {
  const map = new Map<string, Map<string, StoredQuizAnswer>>();

  answers.forEach((answer) => {
    const byQuestion = map.get(answer.questionId) ?? new Map<string, StoredQuizAnswer>();
    byQuestion.set(answer.userId, answer);
    map.set(answer.questionId, byQuestion);
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
  const mismatchQuestions: MismatchQuestion[] = [];
  const categoryScores = new Map<QuizCategory, number[]>();

  for (const question of QUIZ_QUESTIONS) {
    const answersByUser = questionMap.get(question.id);

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

    const doesMismatch = normalizedDistance(firstDoesShare, secondDoesShare, parentIds);
    const thinksMismatch = normalizedDistance(firstThinkShare, secondThinkShare, parentIds);
    const mismatchScore = Math.round((doesMismatch + thinksMismatch) * 100) / 100;

    mismatchQuestions.push({
      questionId: question.id,
      category: question.category,
      prompt: question.prompt,
      mismatchScore,
    });

    const values = categoryScores.get(question.category) ?? [];
    values.push(mismatchScore);
    categoryScores.set(question.category, values);
  }

  const answeredQuestionCount = mismatchQuestions.length;
  const maxPoints = Math.max(answeredQuestionCount, 1);

  const scoresPerUser: Record<string, UserScores> = {
    [firstParentId]: {
      taskLoadScore: toPercent(taskPoints[firstParentId] / maxPoints),
      mentalLoadScore: toPercent(mentalPoints[firstParentId] / maxPoints),
      responsibilityScore: toPercent((taskPoints[firstParentId] + mentalPoints[firstParentId]) / (maxPoints * 2)),
    },
    [secondParentId]: {
      taskLoadScore: toPercent(taskPoints[secondParentId] / maxPoints),
      mentalLoadScore: toPercent(mentalPoints[secondParentId] / maxPoints),
      responsibilityScore: toPercent((taskPoints[secondParentId] + mentalPoints[secondParentId]) / (maxPoints * 2)),
    },
  };

  const sortedMismatchQuestions = mismatchQuestions.sort((a, b) => b.mismatchScore - a.mismatchScore);

  const topConflictCategories = [...categoryScores.entries()]
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
    resultId: resultDocId,
    parentProfiles,
    ...computed,
  };
}
