import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { collectionNames } from '@/services/familyService';
import type { MentalLoadAnswer } from '@/contexts/MentalLoadFlowContext';

type PersistedMentalLoad = {
  initiatorAnswers: MentalLoadAnswer[];
  partnerAnswers: MentalLoadAnswer[];
  initiatorQuizCompleted: boolean;
  partnerQuizCompleted: boolean;
};

const EMPTY: PersistedMentalLoad = {
  initiatorAnswers: [],
  partnerAnswers: [],
  initiatorQuizCompleted: false,
  partnerQuizCompleted: false,
};

export async function loadMentalLoadAnswers(uid: string): Promise<PersistedMentalLoad> {
  const snapshot = await getDoc(doc(db, collectionNames.users, uid));
  const data = snapshot.data()?.mentalLoadFlow as Partial<PersistedMentalLoad> | undefined;

  return {
    initiatorAnswers: Array.isArray(data?.initiatorAnswers) ? data!.initiatorAnswers : [],
    partnerAnswers: Array.isArray(data?.partnerAnswers) ? data!.partnerAnswers : [],
    initiatorQuizCompleted: Boolean(data?.initiatorQuizCompleted),
    partnerQuizCompleted: Boolean(data?.partnerQuizCompleted),
  };
}

export async function saveMentalLoadAnswers(
  uid: string,
  payload: Partial<PersistedMentalLoad>,
) {
  const existing = await loadMentalLoadAnswers(uid);
  await setDoc(
    doc(db, collectionNames.users, uid),
    {
      mentalLoadFlow: {
        ...EMPTY,
        ...existing,
        ...payload,
      },
    },
    { merge: true },
  );
}
