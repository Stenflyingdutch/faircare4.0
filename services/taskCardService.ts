import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type QuizCategory } from '@/lib/quizQuestions';
import { collectionNames, getCurrentUserFamilyId } from '@/services/familyService';
import type { ResultDocument } from '@/services/resultsService';

export type StoredTaskCard = {
  familyId: string;
  title: string;
  category: QuizCategory;
  description: string;
  hiddenResponsibilities: string[];
  frequency: 'daily' | 'weekly' | 'ad-hoc';
  suggestedOwner: string;
  createdAt: Timestamp;
  sourceResultId?: string;
};

const taskCardTemplates: Record<
  QuizCategory,
  {
    title: string;
    description: string;
    hiddenResponsibilities: string[];
    frequency: 'daily' | 'weekly' | 'ad-hoc';
  }
> = {
  Ernährung: {
    title: 'Essensplanung strukturieren',
    description: 'Plant die Baby-Mahlzeiten für die Woche gemeinsam und legt klare Zuständigkeiten fest.',
    hiddenResponsibilities: ['Einkaufsliste aktualisieren', 'Vorräte prüfen', 'Essenszeiten abstimmen'],
    frequency: 'weekly',
  },
  Schlaf: {
    title: 'Schlafroutine ausbalancieren',
    description: 'Definiert, wer Einschlafen, Nachtwachen und Beruhigung übernimmt.',
    hiddenResponsibilities: ['Abendroutine vorbereiten', 'Nachtplan abstimmen', 'Schlafprotokoll prüfen'],
    frequency: 'daily',
  },
  Hygiene: {
    title: 'Pflegeaufgaben fair verteilen',
    description: 'Teilt Wickeln, Baden und Pflegevorbereitung transparent auf.',
    hiddenResponsibilities: ['Pflegeartikel auffüllen', 'Wechselkleidung bereitlegen', 'Baderoutine planen'],
    frequency: 'daily',
  },
  Gesundheit: {
    title: 'Gesundheitstermine koordinieren',
    description: 'Legt fest, wer Arzttermine organisiert und medizinische Aufgaben übernimmt.',
    hiddenResponsibilities: ['Impftermine im Blick behalten', 'Medikamentenplan prüfen', 'Unterlagen aktualisieren'],
    frequency: 'ad-hoc',
  },
  Organisation: {
    title: 'Familienorganisation klären',
    description: 'Erstellt einen Wochenplan für Termine, Ausflüge und Betreuung.',
    hiddenResponsibilities: ['Kalender synchronisieren', 'Wickeltasche planen', 'Abhol- und Bringzeiten abstimmen'],
    frequency: 'weekly',
  },
  'Haushalt mit Baby': {
    title: 'Haushaltslast mit Baby teilen',
    description: 'Definiert, welche Haushaltsaufgaben mit Baby wer wann übernimmt.',
    hiddenResponsibilities: ['Waschplan festlegen', 'Küchenhygiene planen', 'Spielbereiche aufräumen'],
    frequency: 'weekly',
  },
  'Mental Load': {
    title: 'Mental Load sichtbar machen',
    description: 'Sammelt unsichtbare Denkarbeit und verteilt Erinnerungs- und Planungsaufgaben.',
    hiddenResponsibilities: ['To-do-Liste pflegen', 'Prioritäten abstimmen', 'Terminerinnerungen setzen'],
    frequency: 'daily',
  },
};


function getTimestampMillis(value: unknown) {
  if (!value || typeof value !== 'object' || !('toMillis' in value)) {
    return 0;
  }

  const toMillis = (value as { toMillis?: () => number }).toMillis;
  return typeof toMillis === 'function' ? toMillis() : 0;
}

function pickSuggestedOwner(result: ResultDocument, category: QuizCategory) {
  const [firstParentId, secondParentId] = result.userIds;
  const byCategory = result.categoryScoresPerUser?.[category];

  if (byCategory) {
    return byCategory[firstParentId] <= byCategory[secondParentId] ? firstParentId : secondParentId;
  }

  return result.scoresPerUser[firstParentId].responsibilityScore <=
    result.scoresPerUser[secondParentId].responsibilityScore
    ? firstParentId
    : secondParentId;
}

export async function generateTaskCardsFromLatestResult(uid: string) {
  const familyId = await getCurrentUserFamilyId(uid);

  if (!familyId) {
    throw new Error('Kein Familienkonto gefunden.');
  }

  const resultSnapshot = await getDocs(
    query(
      collection(db, collectionNames.results),
      where('familyId', '==', familyId),
    ),
  );

  if (resultSnapshot.empty) {
    throw new Error('Keine Ergebnisse gefunden. Bitte zuerst die Ergebnisse berechnen.');
  }

  const latestResultDoc = [...resultSnapshot.docs].sort(
    (a, b) => getTimestampMillis(b.data().createdAt) - getTimestampMillis(a.data().createdAt),
  )[0];

  const latestResult = latestResultDoc.data() as ResultDocument;

  const categories = latestResult.topConflictCategories
    .filter((entry) => entry.score > 0)
    .map((entry) => entry.category);

  if (categories.length === 0) {
    return { createdCount: 0 };
  }

  const createdCardIds = await Promise.all(
    categories.map(async (category) => {
      const template = taskCardTemplates[category];
      const taskCardRef = doc(collection(db, collectionNames.taskCards));

      await setDoc(taskCardRef, {
        familyId,
        title: template.title,
        category,
        description: template.description,
        hiddenResponsibilities: template.hiddenResponsibilities,
        frequency: template.frequency,
        suggestedOwner: pickSuggestedOwner(latestResult, category),
        sourceResultId: latestResultDoc.id,
        createdAt: serverTimestamp(),
      } satisfies Omit<StoredTaskCard, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> });

      return taskCardRef.id;
    }),
  );

  return { createdCount: createdCardIds.length };
}

export async function loadTaskCardsByFamilyId(familyId: string) {
  const cardsSnapshot = await getDocs(
    query(
      collection(db, collectionNames.taskCards),
      where('familyId', '==', familyId),
    ),
  );

  return cardsSnapshot.docs
    .map((cardDoc) => ({
      taskCardId: cardDoc.id,
      ...(cardDoc.data() as Omit<StoredTaskCard, 'createdAt'> & { createdAt?: Timestamp }),
    }))
    .sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
}


export async function updateTaskCardDecision(
  taskCardId: string,
  payload: {
    suggestedOwner?: string;
    decisionStatus: 'owner_me' | 'owner_partner' | 'discussion';
  },
) {
  const updatePayload: {
    suggestedOwner?: string;
    decisionStatus: 'owner_me' | 'owner_partner' | 'discussion';
    decidedAt: ReturnType<typeof serverTimestamp>;
  } = {
    decisionStatus: payload.decisionStatus,
    decidedAt: serverTimestamp(),
  };

  if (payload.suggestedOwner) {
    updatePayload.suggestedOwner = payload.suggestedOwner;
  }

  await updateDoc(doc(db, collectionNames.taskCards, taskCardId), updatePayload);
}
