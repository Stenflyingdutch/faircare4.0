import {
  collection,
  doc,
  deleteDoc,
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
  relevanceStatus?: 'active' | 'discarded';
  ownershipStatus?: 'unassigned' | 'assigned' | 'discarded';
  assignedTo?: string | null;
  sourceResultId?: string;
  updatedAt?: Timestamp;
  decisionStatus?: 'owner_me' | 'owner_partner' | 'discussion';
  decidedAt?: Timestamp;
};

const MIN_TASK_CARD_COUNT = 5;

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

function isTemplateCategory(category: QuizCategory): category is keyof typeof taskCardTemplates {
  return category in taskCardTemplates;
}

function getTimestampMillis(value: unknown) {
  if (!value || typeof value !== 'object' || !('toMillis' in value)) {
    return 0;
  }

  const toMillis = (value as { toMillis?: () => number }).toMillis;
  return typeof toMillis === 'function' ? toMillis() : 0;
}

function pickSuggestedOwner(result: ResultDocument, _category: QuizCategory) {
  const [firstParentId, secondParentId] = result.userIds;
  const firstCombined =
    result.scoresPerUser[firstParentId].taskLoadScore + result.scoresPerUser[firstParentId].mentalLoadScore;
  const secondCombined =
    result.scoresPerUser[secondParentId].taskLoadScore + result.scoresPerUser[secondParentId].mentalLoadScore;

  return firstCombined <= secondCombined ? firstParentId : secondParentId;
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

  const prioritizedCategories = (latestResult.topConflictCategories ?? [])
    .filter((entry) => entry.score > 0)
    .map((entry) => entry.category)
    .filter(isTemplateCategory);

  const fallbackCategories = (Object.keys(taskCardTemplates) as (keyof typeof taskCardTemplates)[]).filter(
    (category) => !prioritizedCategories.includes(category),
  );

  const categories = [...prioritizedCategories, ...fallbackCategories].slice(
    0,
    Math.max(MIN_TASK_CARD_COUNT, prioritizedCategories.length),
  );

  const createdCardIds = await Promise.all(
    categories.map(async (category) => {
      const template = taskCardTemplates[category];
      if (!template) {
        return null;
      }
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

  const successfulCardIds = createdCardIds.filter((cardId): cardId is string => Boolean(cardId));
  return { createdCount: successfulCardIds.length };
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

export async function updateTaskCard(
  taskCardId: string,
  payload: Partial<Pick<StoredTaskCard, 'title' | 'category' | 'description' | 'hiddenResponsibilities' | 'frequency' | 'suggestedOwner'>>,
) {
  await updateDoc(doc(db, collectionNames.taskCards, taskCardId), payload);
}

export async function deleteTaskCard(taskCardId: string) {
  await deleteDoc(doc(db, collectionNames.taskCards, taskCardId));
}

export async function createTaskCard(
  familyId: string,
  payload: Pick<StoredTaskCard, 'title' | 'category' | 'description' | 'hiddenResponsibilities' | 'frequency' | 'suggestedOwner'>,
) {
  const taskCardRef = doc(collection(db, collectionNames.taskCards));
  await setDoc(taskCardRef, {
    familyId,
    ...payload,
    createdAt: serverTimestamp(),
  } satisfies Omit<StoredTaskCard, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> });
}

export async function ensureInitialTaskCardsForCurrentFamily(uid: string) {
  const familyId = await getCurrentUserFamilyId(uid);
  if (!familyId) {
    throw new Error('Kein Familienkonto gefunden.');
  }

  const existingCards = await loadTaskCardsByFamilyId(familyId);
  if (existingCards.length > 0) {
    return { createdCount: 0 };
  }

  return generateTaskCardsFromLatestResult(uid);
}

export async function updateTaskCardOwnership(
  taskCardId: string,
  payload: {
    ownershipStatus?: 'unassigned' | 'assigned' | 'discarded';
    relevanceStatus?: 'active' | 'discarded';
    assignedTo?: string | null;
    suggestedOwner?: string;
  },
) {
  await updateDoc(doc(db, collectionNames.taskCards, taskCardId), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

export async function restoreTaskCard(taskCardId: string) {
  await updateTaskCardOwnership(taskCardId, {
    ownershipStatus: 'unassigned',
    relevanceStatus: 'active',
    assignedTo: null,
  });
}

export async function storePostAssignmentResult(payload: {
  familyId: string;
  beforeAssignmentMentalLoad: Record<string, number>;
  afterAssignmentMentalLoad: Record<string, number>;
  assignedCardCounts: Record<string, number>;
  discardedCardCounts: number;
}) {
  const resultRef = doc(collection(db, collectionNames.results));
  await setDoc(resultRef, {
    ...payload,
    createdAt: serverTimestamp(),
    type: 'post_assignment_snapshot',
  });
}
