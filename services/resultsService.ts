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
  categoryScoresPerUser: Record<QuizCategory, Record<string, number>>;
  mismatchQuestions: MismatchQuestion[];
  topConflictCategories: { category: QuizCategory; score: number }[];
  beforeAssignmentMentalLoad?: Record<string, number>;
  afterAssignmentMentalLoad?: Record<string, number>;
  fairnessMessage?: string;
  assignedCardCounts?: Record<string, number>;
  discardedCardCounts?: Record<string, number>;
};

type InProgressResult = Omit<ResultDocument, 'createdAt'>;

function toPercent(value: number) {
  return Math.round(value * 1000) / 10;
}

function mergeShare(target: Record<string, number>, userId: string, value: number) {
  target[userId] = (target[userId] ?? 0) + value;
}

function optionToShare(option: QuizOption, responderId: string, partnerId: string): Record<string, number> {
  const shares: Record<string, number> = { [responderId]: 0, [partnerId]: 0 };

  if (option === 'ich') {
    mergeShare(shares, responderId, 1);
  } else if (option === 'partner') {
    mergeShare(shares, partnerId, 1);
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

function timestampMillis(value: unknown) {
  if (!value || typeof value !== 'object' || !('toMillis' in value)) {
    return 0;
  }
  const toMillis = (value as { toMillis?: () => number }).toMillis;
  return typeof toMillis === 'function' ? toMillis() : 0;
}

export async function loadLatestResultForFamily(familyId: string): Promise<{ id: string; data: ResultDocument } | null> {
  const resultSnapshot = await getDocs(query(collection(db, collectionNames.results), where('familyId', '==', familyId)));
  if (resultSnapshot.empty) {
    return null;
  }

  const latestResultDoc = [...resultSnapshot.docs].sort(
    (a, b) => timestampMillis(b.data().createdAt) - timestampMillis(a.data().createdAt),
  )[0];

  return { id: latestResultDoc.id, data: latestResultDoc.data() as ResultDocument };
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
  const categoryTaskPoints: Record<QuizCategory, Record<string, number>> = {} as Record<QuizCategory, Record<string, number>>;
  const categoryMentalPoints: Record<QuizCategory, Record<string, number>> = {} as Record<QuizCategory, Record<string, number>>;
  const categoryQuestionCounts: Record<QuizCategory, number> = {} as Record<QuizCategory, number>;

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

    categoryTaskPoints[question.category] = categoryTaskPoints[question.category] ?? { [firstParentId]: 0, [secondParentId]: 0 };
    categoryMentalPoints[question.category] = categoryMentalPoints[question.category] ?? { [firstParentId]: 0, [secondParentId]: 0 };
    categoryQuestionCounts[question.category] = (categoryQuestionCounts[question.category] ?? 0) + 1;

    categoryTaskPoints[question.category][firstParentId] += (firstDoesShare[firstParentId] + secondDoesShare[firstParentId]) / 2;
    categoryTaskPoints[question.category][secondParentId] += (firstDoesShare[secondParentId] + secondDoesShare[secondParentId]) / 2;
    categoryMentalPoints[question.category][firstParentId] += (firstThinkShare[firstParentId] + secondThinkShare[firstParentId]) / 2;
    categoryMentalPoints[question.category][secondParentId] += (firstThinkShare[secondParentId] + secondThinkShare[secondParentId]) / 2;

    const doesMismatch = normalizedDistance(firstDoesShare, secondDoesShare, parentIds);
    const thinksMismatch = normalizedDistance(firstThinkShare, secondThinkShare, parentIds);
    const mismatchScore = Math.round((doesMismatch + thinksMismatch) * 100) / 100;

    mismatchQuestions.push({
      questionId: question.id,
      category: question.category,
      prompt: question.question,
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

  const categoryScoresPerUser = (Object.keys(categoryQuestionCounts) as QuizCategory[]).reduce((acc, category) => {
    const questionCount = Math.max(categoryQuestionCounts[category] ?? 0, 1);
    const task = categoryTaskPoints[category] ?? { [firstParentId]: 0, [secondParentId]: 0 };
    const mental = categoryMentalPoints[category] ?? { [firstParentId]: 0, [secondParentId]: 0 };

    acc[category] = {
      [firstParentId]: toPercent((task[firstParentId] + mental[firstParentId]) / (questionCount * 2)),
      [secondParentId]: toPercent((task[secondParentId] + mental[secondParentId]) / (questionCount * 2)),
    };

    return acc;
  }, {} as Record<QuizCategory, Record<string, number>>);

  const sortedMismatchQuestions = mismatchQuestions.sort((a, b) => b.mismatchScore - a.mismatchScore);

  const topConflictCategories = [...categoryScores.entries()]
    .map(([category, scores]) => {
      const total = scores.reduce((sum, value) => sum + value, 0);
      return { category, score: Math.round((total / scores.length) * 100) / 100 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return {
    familyId,
    userIds: parentIds,
    scoresPerUser,
    categoryScoresPerUser,
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
  const memberIds = (familySnapshot.data()?.memberIds as string[] | undefined) ?? [];
  const parentIds = memberIds.slice(0, 2);

  if (parentIds.length < 2) {
    throw new Error('Bitte fügt ein zweites Elternteil zur Familie hinzu, um Ergebnisse zu berechnen.');
  }

  const inProgressResult = await calculateResultsForFamily(familyId, [parentIds[0], parentIds[1]]);
  const parentProfiles = await loadParentProfiles(inProgressResult.userIds);
  const resultRef = doc(collection(db, collectionNames.results));

  await setDoc(resultRef, {
    ...inProgressResult,
    createdAt: serverTimestamp(),
  } satisfies InProgressResult & { createdAt: ReturnType<typeof serverTimestamp> });

  return {
    resultId: resultRef.id,
    ...inProgressResult,
    parentProfiles,
  };
}

export async function updateAssignmentComparisonForFamily(familyId: string) {
  const latest = await loadLatestResultForFamily(familyId);
  if (!latest || latest.data.userIds.length < 2) {
    return null;
  }

  const [firstParentId, secondParentId] = latest.data.userIds;

  const cardsSnapshot = await getDocs(query(collection(db, collectionNames.taskCards), where('familyId', '==', familyId)));
  const cards = cardsSnapshot.docs.map((card) => card.data() as { assignedTo?: string | null; ownershipStatus?: string; relevanceStatus?: string });

  const assignedCardCounts: Record<string, number> = { [firstParentId]: 0, [secondParentId]: 0 };
  const discardedCardCounts: Record<string, number> = { [firstParentId]: 0, [secondParentId]: 0 };

  cards.forEach((card) => {
    if (card.relevanceStatus === 'discarded') {
      if (card.assignedTo === firstParentId || card.assignedTo === secondParentId) {
        discardedCardCounts[card.assignedTo] += 1;
      }
      return;
    }

    if (card.ownershipStatus === 'assigned' && card.assignedTo && assignedCardCounts[card.assignedTo] !== undefined) {
      assignedCardCounts[card.assignedTo] += 1;
    }
  });

  const assignedTotal = assignedCardCounts[firstParentId] + assignedCardCounts[secondParentId];
  const afterAssignmentMentalLoad: Record<string, number> = assignedTotal
    ? {
        [firstParentId]: Math.round((assignedCardCounts[firstParentId] / assignedTotal) * 1000) / 10,
        [secondParentId]: Math.round((assignedCardCounts[secondParentId] / assignedTotal) * 1000) / 10,
      }
    : {
        [firstParentId]: latest.data.scoresPerUser[firstParentId].mentalLoadScore,
        [secondParentId]: latest.data.scoresPerUser[secondParentId].mentalLoadScore,
      };

  const beforeAssignmentMentalLoad: Record<string, number> = {
    [firstParentId]: latest.data.scoresPerUser[firstParentId].mentalLoadScore,
    [secondParentId]: latest.data.scoresPerUser[secondParentId].mentalLoadScore,
  };

  const fairnessMessage =
    'Diese Schätzung zeigt Tendenzen statt fixer Wahrheiten: Ziel ist nicht 50:50, sondern eine Verteilung, die sich für euch beide fair anfühlt. Berücksichtigt dabei Arbeit, Stress, mentale Last außerhalb der Kinderbetreuung und euren gesamten Alltag.';

  await setDoc(
    doc(db, collectionNames.results, latest.id),
    {
      beforeAssignmentMentalLoad,
      afterAssignmentMentalLoad,
      fairnessMessage,
      assignedCardCounts,
      discardedCardCounts,
    },
    { merge: true },
  );

  return {
    beforeAssignmentMentalLoad,
    afterAssignmentMentalLoad,
    fairnessMessage,
    assignedCardCounts,
    discardedCardCounts,
  };
}
