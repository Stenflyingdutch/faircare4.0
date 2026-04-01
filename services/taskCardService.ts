import {
  collection,
  deleteDoc,
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
import { collectionNames, getCurrentUserFamilyId } from '@/services/familyService';
import type { ResultDocument } from '@/services/resultsService';
import type { StoredQuizAnswer } from '@/services/quizService';

export type RelevanceStatus = 'active' | 'discarded';
export type OwnershipStatus = 'unassigned' | 'assigned' | 'discarded';

export type TaskCardSeed = {
  category: string;
  title: string;
  description: string;
  thinkingTasks: string[];
  doingTasks: string[];
};

export type StoredTaskCard = {
  familyId: string;
  category: string;
  title: string;
  description: string;
  thinkingTasks: string[];
  doingTasks: string[];
  relevanceStatus: RelevanceStatus;
  ownershipStatus: OwnershipStatus;
  assignedTo: string | null;
  suggestedOwner: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

const INITIAL_TASK_CARD_SEEDS: TaskCardSeed[] = [
  {
    category: 'Ernährung',
    title: 'Mahlzeiten planen',
    description: 'Verantwortung dafür, dass Mahlzeiten des Kindes im Alltag verlässlich eingeplant sind.',
    thinkingTasks: [
      'wissen, wann das Kind essen muss',
      'planen, was es heute gibt',
      'Vorräte im Blick behalten',
    ],
    doingTasks: ['Essen vorbereiten', 'Essen bereitstellen', 'bei Bedarf füttern'],
  },
  {
    category: 'Ernährung',
    title: 'Fläschchen organisieren',
    description: 'Verantwortung für Material, Timing und Verfügbarkeit von Fläschchen.',
    thinkingTasks: ['genug Milch, Pulver oder Zubehör im Blick haben', 'Trinkzeiten beachten'],
    doingTasks: ['Fläschchen vorbereiten', 'reinigen', 'bereitstellen'],
  },
  {
    category: 'Ernährung',
    title: 'Snacks und Getränke für unterwegs',
    description: 'Verantwortung, dass unterwegs passende Verpflegung für das Kind verfügbar ist.',
    thinkingTasks: ['an Ausflüge oder Termine denken', 'genug für unterwegs einplanen'],
    doingTasks: ['Tasche packen', 'Snacks vorbereiten', 'Getränke mitnehmen'],
  },
  {
    category: 'Schlaf',
    title: 'Einschlafroutine abends',
    description: 'Verantwortung für einen verlässlichen Abendablauf bis das Kind schläft.',
    thinkingTasks: ['Schlafenszeit im Blick behalten', 'Müdigkeit erkennen'],
    doingTasks: ['Abendroutine durchführen', 'Kind ins Bett bringen'],
  },
  {
    category: 'Schlaf',
    title: 'Tagschlaf organisieren',
    description: 'Verantwortung für passende Tagschlaf-Zeiten und Vorbereitung.',
    thinkingTasks: ['Schlafrhythmus im Blick behalten', 'Tagesplanung darauf abstimmen'],
    doingTasks: ['Schlafumgebung vorbereiten', 'Kind zum Schlafen bringen'],
  },
  {
    category: 'Schlaf',
    title: 'Nächtliches Aufwachen begleiten',
    description: 'Verantwortung für Reaktion und Versorgung bei nächtlichem Aufwachen.',
    thinkingTasks: ['auf Signale achten', 'Nachtbedarf vorbereiten'],
    doingTasks: ['aufstehen', 'beruhigen', 'versorgen'],
  },
  {
    category: 'Hygiene und Pflege',
    title: 'Wickeln organisieren',
    description: 'Verantwortung für Wickelrhythmus und funktionierenden Wickelplatz.',
    thinkingTasks: ['Wickelintervalle im Blick haben', 'Material rechtzeitig nachfüllen'],
    doingTasks: ['wickeln', 'Wickelplatz sauber halten'],
  },
  {
    category: 'Hygiene und Pflege',
    title: 'Baden und Körperpflege',
    description: 'Verantwortung für regelmäßige Körperpflege und Durchführung.',
    thinkingTasks: ['Pflegebedarf erkennen', 'geeignete Zeit einplanen'],
    doingTasks: ['baden', 'eincremen', 'Nägel oder Haare pflegen'],
  },
  {
    category: 'Hygiene und Pflege',
    title: 'Pflegeprodukte im Blick behalten',
    description: 'Verantwortung für Bestand und Nachkauf von Pflegeprodukten.',
    thinkingTasks: ['Creme, Tücher, Windeln, Waschmittel prüfen'],
    doingTasks: ['nachkaufen', 'einsortieren'],
  },
  {
    category: 'Gesundheit',
    title: 'Arzttermine organisieren',
    description: 'Verantwortung für medizinische Termine inklusive Vorbereitung und Durchführung.',
    thinkingTasks: ['Vorsorge, Impfungen und Kontrollen im Blick behalten'],
    doingTasks: ['Termin buchen', 'wahrnehmen', 'Unterlagen mitnehmen'],
  },
  {
    category: 'Gesundheit',
    title: 'Krankheitssituationen managen',
    description: 'Verantwortung für Beobachtung und Handeln bei Krankheit des Kindes.',
    thinkingTasks: ['Symptome beobachten', 'Medikamente und Hilfsmittel im Blick halten'],
    doingTasks: ['Kind versorgen', 'Rücksprache halten', 'Medikamente geben'],
  },
  {
    category: 'Gesundheit',
    title: 'Gesundheitsunterlagen pflegen',
    description: 'Verantwortung dafür, dass alle Gesundheitsdokumente aktuell und griffbereit sind.',
    thinkingTasks: ['Impfpass, U-Heft und Dokumente auffindbar halten'],
    doingTasks: ['Unterlagen sortieren', 'zu Terminen mitnehmen'],
  },
  {
    category: 'Organisation',
    title: 'Tagesablauf koordinieren',
    description: 'Verantwortung für den täglichen Gesamtüberblick über Baby-Care-Aufgaben.',
    thinkingTasks: ['Schlaf, Essen, Termine und Wege im Blick behalten'],
    doingTasks: ['Tagesplan umsetzen', 'Absprachen treffen'],
  },
  {
    category: 'Organisation',
    title: 'Wochenplanung der Care-Aufgaben',
    description: 'Verantwortung für die planerische Aufteilung der kommenden Woche.',
    thinkingTasks: ['kommende Woche gedanklich vorbereiten', 'Engpässe erkennen'],
    doingTasks: ['Aufgaben verteilen', 'Zeiten abstimmen'],
  },
  {
    category: 'Organisation',
    title: 'Betreuung abstimmen',
    description: 'Verantwortung für klare Übergaben und Betreuungslücken vermeiden.',
    thinkingTasks: ['wer wann übernimmt', 'Engpässe früh erkennen'],
    doingTasks: ['Übergaben organisieren', 'Absprachen festhalten'],
  },
  {
    category: 'Haushalt mit Baby',
    title: 'Babywäsche organisieren',
    description: 'Verantwortung dafür, dass Babywäsche rechtzeitig sauber verfügbar ist.',
    thinkingTasks: ['saubere Kleidung und Schlafsachen im Blick halten'],
    doingTasks: ['waschen', 'trocknen', 'sortieren'],
  },
  {
    category: 'Haushalt mit Baby',
    title: 'Essplatz und Küchenchaos nach Baby-Mahlzeiten',
    description: 'Verantwortung für Reinigung nach Mahlzeiten des Kindes.',
    thinkingTasks: ['Reinigungsbedarf sehen'],
    doingTasks: ['sauber machen', 'Zubehör reinigen'],
  },
  {
    category: 'Haushalt mit Baby',
    title: 'Spiel- und Wohnbereich babytauglich halten',
    description: 'Verantwortung für Ordnung und Sicherheit in genutzten Bereichen.',
    thinkingTasks: ['Sicherheit und Ordnung im Blick halten'],
    doingTasks: ['aufräumen', 'Gefahren entfernen'],
  },
  {
    category: 'Kleidung und Ausstattung',
    title: 'Passende Kleidung bereithalten',
    description: 'Verantwortung für passende Kleidung je Wetter und Situation.',
    thinkingTasks: ['Wetter und Größe im Blick behalten'],
    doingTasks: ['Kleidung auswählen', 'bereitlegen'],
  },
  {
    category: 'Kleidung und Ausstattung',
    title: 'Größenwechsel organisieren',
    description: 'Verantwortung dafür, dass zu kleine Kleidung ersetzt wird.',
    thinkingTasks: ['erkennen, wenn Kleidung zu klein wird'],
    doingTasks: ['aussortieren', 'neue Sachen besorgen'],
  },
  {
    category: 'Kleidung und Ausstattung',
    title: 'Ausstattung für unterwegs pflegen',
    description: 'Verantwortung für Funktionsfähigkeit und Vollständigkeit unterwegs.',
    thinkingTasks: ['Kinderwagen, Trage, Wickeltasche und Zubehör prüfen'],
    doingTasks: ['packen', 'reinigen', 'einsatzbereit halten'],
  },
  {
    category: 'Termine und Dokumente',
    title: 'Kita und Betreuungsdokumente',
    description: 'Verantwortung für Fristen und Vollständigkeit von Betreuungsunterlagen.',
    thinkingTasks: ['Fristen und Unterlagen im Blick behalten'],
    doingTasks: ['Formulare ausfüllen', 'Unterlagen einreichen'],
  },
  {
    category: 'Termine und Dokumente',
    title: 'Administrative Kinderthemen',
    description: 'Verantwortung für Verwaltungsthemen rund ums Kind.',
    thinkingTasks: ['Versicherungen, Anträge, Bescheinigungen im Blick behalten'],
    doingTasks: ['Unterlagen bearbeiten', 'absenden'],
  },
  {
    category: 'Termine und Dokumente',
    title: 'Familienkalender aktuell halten',
    description: 'Verantwortung dafür, dass Termine und Fristen sichtbar und aktuell sind.',
    thinkingTasks: ['alle Termine und Fristen sammeln'],
    doingTasks: ['eintragen', 'aktualisieren', 'erinnern'],
  },
  {
    category: 'Emotionale und soziale Care',
    title: 'Übergänge begleiten',
    description: 'Verantwortung für sensible Begleitung bei Übergängen und Stressmomenten.',
    thinkingTasks: ['erkennen, wann das Kind Ruhe oder Nähe braucht'],
    doingTasks: ['beruhigen', 'begleiten', 'Sicherheit geben'],
  },
  {
    category: 'Emotionale und soziale Care',
    title: 'Bindungszeit aktiv einplanen',
    description: 'Verantwortung für bewusste exklusive Bindungszeit mit dem Kind.',
    thinkingTasks: ['freie Zeit und Beziehungszeit bewusst mitdenken'],
    doingTasks: ['gemeinsame Zeit gestalten', 'ungeteilte Aufmerksamkeit geben'],
  },
  {
    category: 'Emotionale und soziale Care',
    title: 'Kontakt zu Großeltern oder Betreuungspersonen abstimmen',
    description: 'Verantwortung für Abstimmung mit unterstützenden Bezugspersonen.',
    thinkingTasks: ['soziale Kontakte und Absprachen im Blick halten'],
    doingTasks: ['Nachrichten schreiben', 'Besuche abstimmen'],
  },
  {
    category: 'Mental Load und Vorausplanung',
    title: 'Vorräte für das Kind vorausplanen',
    description: 'Verantwortung für rechtzeitige Verfügbarkeit zentraler Verbrauchsgüter.',
    thinkingTasks: ['Windeln, Essen, Kleidung, Medikamente und Pflege im Blick halten'],
    doingTasks: ['Liste führen', 'besorgen', 'nachfüllen'],
  },
  {
    category: 'Mental Load und Vorausplanung',
    title: 'Nächste Entwicklungsphase mitdenken',
    description: 'Verantwortung, kommende Entwicklungsbedarfe frühzeitig zu antizipieren.',
    thinkingTasks: ['an neue Bedürfnisse, Schlafveränderungen oder Essensthemen denken'],
    doingTasks: ['Dinge anpassen', 'Neues vorbereiten'],
  },
  {
    category: 'Mental Load und Vorausplanung',
    title: 'Unerledigte Care-Themen im Kopf behalten',
    description: 'Verantwortung für Nachhalten und Abschluss offener Care-Themen.',
    thinkingTasks: ['offene Punkte sammeln und priorisieren'],
    doingTasks: ['anstoßen', 'nachfassen', 'abschließen'],
  },
];

function getTimestampMillis(value: unknown) {
  if (!value || typeof value !== 'object' || !('toMillis' in value)) {
    return 0;
  }

  const toMillis = (value as { toMillis?: () => number }).toMillis;
  return typeof toMillis === 'function' ? toMillis() : 0;
}

async function loadLatestResult(familyId: string): Promise<{ id: string; data: ResultDocument } | null> {
  const resultSnapshot = await getDocs(query(collection(db, collectionNames.results), where('familyId', '==', familyId)));

  if (resultSnapshot.empty) {
    return null;
  }

  const latestResultDoc = [...resultSnapshot.docs].sort(
    (a, b) => getTimestampMillis(b.data().createdAt) - getTimestampMillis(a.data().createdAt),
  )[0];

  return { id: latestResultDoc.id, data: latestResultDoc.data() as ResultDocument };
}

async function loadLatestQuizAnswers(familyId: string) {
  const answersSnapshot = await getDocs(query(collection(db, collectionNames.quizAnswers), where('familyId', '==', familyId)));

  const latestByUserAndQuestion = new Map<string, StoredQuizAnswer & { updatedAt?: Timestamp }>();

  answersSnapshot.docs.forEach((snapshot) => {
    const answer = snapshot.data() as StoredQuizAnswer & { updatedAt?: Timestamp };
    const key = `${answer.userId}_${answer.questionId}`;
    const previous = latestByUserAndQuestion.get(key);
    if (!previous) {
      latestByUserAndQuestion.set(key, answer);
      return;
    }

    if (getTimestampMillis(answer.updatedAt) >= getTimestampMillis(previous.updatedAt)) {
      latestByUserAndQuestion.set(key, answer);
    }
  });

  return [...latestByUserAndQuestion.values()];
}

function pickSuggestedOwner(result: ResultDocument | null, quizAnswers: StoredQuizAnswer[], cardTitle: string) {
  if (!result || result.userIds.length < 2) {
    return null;
  }

  const [firstParentId, secondParentId] = result.userIds;
  const firstScores = result.scoresPerUser[firstParentId];
  const secondScores = result.scoresPerUser[secondParentId];
  const firstLoad = firstScores.taskLoadScore + firstScores.mentalLoadScore;
  const secondLoad = secondScores.taskLoadScore + secondScores.mentalLoadScore;

  if (firstLoad !== secondLoad) {
    return firstLoad <= secondLoad ? firstParentId : secondParentId;
  }

  const firstUnhappy = quizAnswers.filter((item) => item.userId === firstParentId && item.satisfaction === 'unhappy').length;
  const secondUnhappy = quizAnswers.filter((item) => item.userId === secondParentId && item.satisfaction === 'unhappy').length;

  if (firstUnhappy !== secondUnhappy) {
    return firstUnhappy >= secondUnhappy ? secondParentId : firstParentId;
  }

  return cardTitle.charCodeAt(0) % 2 === 0 ? firstParentId : secondParentId;
}

function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase('de-DE');
}

function createCardKey(card: { category?: string; title?: string }) {
  return `${normalizeText(card.category ?? '')}::${normalizeText(card.title ?? '')}`;
}

function cardPriority(card: Partial<StoredTaskCard> & { updatedAt?: Timestamp; createdAt?: Timestamp }) {
  const isAssigned = card.ownershipStatus === 'assigned' ? 1 : 0;
  const isActive = card.relevanceStatus === 'active' ? 1 : 0;
  const updatedAt = getTimestampMillis(card.updatedAt);
  const createdAt = getTimestampMillis(card.createdAt);
  return [isAssigned, isActive, updatedAt, createdAt] as const;
}

function isBetterCard(
  first: Partial<StoredTaskCard> & { updatedAt?: Timestamp; createdAt?: Timestamp },
  second: Partial<StoredTaskCard> & { updatedAt?: Timestamp; createdAt?: Timestamp },
) {
  const firstPriority = cardPriority(first);
  const secondPriority = cardPriority(second);

  for (let index = 0; index < firstPriority.length; index += 1) {
    if (firstPriority[index] !== secondPriority[index]) {
      return firstPriority[index] > secondPriority[index];
    }
  }

  return false;
}

async function removeDuplicateTaskCards(
  snapshots: Awaited<ReturnType<typeof getDocs>>['docs'],
) {
  const groupedByKey = new Map<string, typeof snapshots>();

  snapshots.forEach((snapshot) => {
    const data = snapshot.data() as Partial<StoredTaskCard>;
    const key = createCardKey(data);
    const group = groupedByKey.get(key) ?? [];
    group.push(snapshot);
    groupedByKey.set(key, group);
  });

  const duplicateIdsToDelete: string[] = [];

  groupedByKey.forEach((group) => {
    if (group.length < 2) {
      return;
    }

    const sorted = [...group].sort((a, b) => {
      const aData = a.data() as Partial<StoredTaskCard> & { updatedAt?: Timestamp; createdAt?: Timestamp };
      const bData = b.data() as Partial<StoredTaskCard> & { updatedAt?: Timestamp; createdAt?: Timestamp };
      if (isBetterCard(aData, bData)) {
        return -1;
      }
      if (isBetterCard(bData, aData)) {
        return 1;
      }
      return 0;
    });

    sorted.slice(1).forEach((snapshot) => {
      duplicateIdsToDelete.push(snapshot.id);
    });
  });

  await Promise.all(duplicateIdsToDelete.map((taskCardId) => deleteDoc(doc(db, collectionNames.taskCards, taskCardId))));
}

export async function ensureInitialTaskCardsForCurrentFamily(uid: string) {
  const familyId = await getCurrentUserFamilyId(uid);

  if (!familyId) {
    throw new Error('Kein Familienkonto gefunden.');
  }

  const [existingSnapshot, latestResult, latestQuizAnswers] = await Promise.all([
    getDocs(query(collection(db, collectionNames.taskCards), where('familyId', '==', familyId))),
    loadLatestResult(familyId),
    loadLatestQuizAnswers(familyId),
  ]);

  await removeDuplicateTaskCards(existingSnapshot.docs);

  const deduplicatedSnapshot = await getDocs(query(collection(db, collectionNames.taskCards), where('familyId', '==', familyId)));

  const existingKeys = new Set(
    deduplicatedSnapshot.docs.map((snapshot) => {
      const data = snapshot.data() as Partial<StoredTaskCard>;
      return createCardKey(data);
    }),
  );

  const cardsToCreate = INITIAL_TASK_CARD_SEEDS.filter(
    (seed) => !existingKeys.has(`${normalizeText(seed.category)}::${normalizeText(seed.title)}`),
  );

  await Promise.all(
    cardsToCreate.map(async (seed) => {
      const taskCardRef = doc(collection(db, collectionNames.taskCards));
      const suggestedOwner = pickSuggestedOwner(latestResult?.data ?? null, latestQuizAnswers, seed.title);
      await setDoc(taskCardRef, {
        familyId,
        category: seed.category,
        title: seed.title,
        description: seed.description,
        thinkingTasks: seed.thinkingTasks,
        doingTasks: seed.doingTasks,
        relevanceStatus: 'active',
        ownershipStatus: 'unassigned',
        assignedTo: null,
        suggestedOwner,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }),
  );

  return {
    familyId,
    createdCount: cardsToCreate.length,
    totalSeedCount: INITIAL_TASK_CARD_SEEDS.length,
  };
}

export async function loadTaskCardsByFamilyId(familyId: string) {
  const cardsSnapshot = await getDocs(query(collection(db, collectionNames.taskCards), where('familyId', '==', familyId)));

  return cardsSnapshot.docs
    .map((cardDoc) => ({
      taskCardId: cardDoc.id,
      ...(cardDoc.data() as Omit<StoredTaskCard, 'createdAt' | 'updatedAt'> & {
        createdAt?: Timestamp;
        updatedAt?: Timestamp;
      }),
    }))
    .sort((a, b) => {
      const categorySort = (a.category ?? '').localeCompare(b.category ?? '', 'de-DE');
      if (categorySort !== 0) {
        return categorySort;
      }
      return (a.title ?? '').localeCompare(b.title ?? '', 'de-DE');
    });
}

export async function updateTaskCardOwnership(
  taskCardId: string,
  payload: {
    ownershipStatus: OwnershipStatus;
    assignedTo: string | null;
    suggestedOwner?: string | null;
    relevanceStatus?: RelevanceStatus;
  },
) {
  await updateDoc(doc(db, collectionNames.taskCards, taskCardId), {
    ownershipStatus: payload.ownershipStatus,
    assignedTo: payload.assignedTo,
    suggestedOwner: payload.suggestedOwner ?? payload.assignedTo,
    relevanceStatus: payload.relevanceStatus ?? (payload.ownershipStatus === 'discarded' ? 'discarded' : 'active'),
    updatedAt: serverTimestamp(),
  });
}

export async function restoreTaskCard(taskCardId: string) {
  await updateDoc(doc(db, collectionNames.taskCards, taskCardId), {
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
    assignedTo: null,
    updatedAt: serverTimestamp(),
  });
}

function buildFairnessMessage() {
  return (
    'Der Vergleich ist eine Schätzung und keine feste Wahrheit. Ziel ist nicht eine starre 50:50-Aufteilung, sondern ' +
    'eine Verteilung, die sich für beide Eltern fair anfühlt. Fairness berücksichtigt immer auch Arbeit, Stress, Gesundheit, ' +
    'weitere Care-Aufgaben und den gesamten Alltag beider Eltern.'
  );
}

export async function storePostAssignmentResult(params: {
  familyId: string;
  beforeAssignmentMentalLoad: Record<string, number>;
  afterAssignmentMentalLoad: Record<string, number>;
  assignedCardCounts: Record<string, number>;
  discardedCardCounts: number;
}) {
  const resultRef = doc(collection(db, collectionNames.results));
  await setDoc(resultRef, {
    familyId: params.familyId,
    beforeAssignmentMentalLoad: params.beforeAssignmentMentalLoad,
    afterAssignmentMentalLoad: params.afterAssignmentMentalLoad,
    fairnessMessage: buildFairnessMessage(),
    assignedCardCounts: params.assignedCardCounts,
    discardedCardCounts: params.discardedCardCounts,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
