import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { collectionNames, getCurrentUserFamilyId } from '@/services/familyService';
import type { QuizCategory, QuizOption } from '@/lib/quizQuestions';

export interface StoredQuizAnswer {
  familyId: string;
  userId: string;
  category: QuizCategory;
  questionId: string;
  doesIt: QuizOption;
  thinksAboutIt: QuizOption;
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
    const data = quizDoc.data() as StoredQuizAnswer;
    answers.set(data.questionId, data);
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
