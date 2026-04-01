import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { collectionNames, getCurrentUserFamilyId } from '@/services/familyService';
import type { QuizOption, SatisfactionOption } from '@/lib/quizQuestions';

export interface StoredQuizAnswer {
  familyId: string;
  userId: string;
  category: string;
  questionId: string;
  doesIt: QuizOption;
  thinksAboutIt: QuizOption;
  satisfaction: SatisfactionOption;
}

function getQuizAnswerDocId(params: { familyId: string; userId: string; questionId: string }) {
  return `${params.familyId}_${params.userId}_${params.questionId}`;
}

export async function loadQuizAnswersByUser(uid: string) {
  const familyId = await getCurrentUserFamilyId(uid);

  if (!familyId) {
    return { familyId: null, answers: new Map<string, StoredQuizAnswer>() };
  }

  const snapshot = await getDocs(
    query(
      collection(db, collectionNames.quizAnswers),
      where('familyId', '==', familyId),
      where('userId', '==', uid),
    ),
  );

  const answers = new Map<string, StoredQuizAnswer>();
  snapshot.forEach((quizDoc) => {
    const data = quizDoc.data() as Partial<StoredQuizAnswer>;

    if (!data.questionId || !data.familyId || !data.userId || !data.category || !data.doesIt || !data.thinksAboutIt) {
      return;
    }

    answers.set(data.questionId, {
      familyId: data.familyId,
      userId: data.userId,
      category: data.category,
      questionId: data.questionId,
      doesIt: data.doesIt,
      thinksAboutIt: data.thinksAboutIt,
      satisfaction: data.satisfaction ?? 'neutral',
    });
  });

  return { familyId, answers };
}

export async function saveQuizAnswer(params: StoredQuizAnswer) {
  const answerDocId = getQuizAnswerDocId(params);
  await setDoc(doc(db, collectionNames.quizAnswers, answerDocId), {
    ...params,
    updatedAt: serverTimestamp(),
  });
}
