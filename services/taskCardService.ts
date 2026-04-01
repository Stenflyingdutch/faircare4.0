import {
  collection,
  doc,
  getDoc,
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
import { loadLatestResultForFamily, updateAssignmentComparisonForFamily, type ResultDocument } from '@/services/resultsService';
import type { StoredQuizAnswer } from '@/services/quizService';

export type TaskCardCategory =
  | 'Ernährung'
  | 'Schlaf'
  | 'Hygiene und Pflege'
  | 'Gesundheit'
  | 'Organisation'
  | 'Haushalt mit Baby'
  | 'Kleidung und Ausstattung'
  | 'Termine und Dokumente'
  | 'Emotionale und soziale Care'
  | 'Mental Load und Vorausplanung';

export type StoredTaskCard = {
  familyId: string;
  category: TaskCardCategory;
  title: string;
  description: string;
  thinkingTasks: string[];
  doingTasks: string[];
  relevanceStatus: 'active' | 'discarded';
  ownershipStatus: 'unassigned' | 'assigned' | 'discarded';
  assignedTo: string | null;
  suggestedOwner: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

const INITIAL_TASK_CARDS: Omit<StoredTaskCard, 'familyId' | 'createdAt' | 'updatedAt' | 'suggestedOwner' | 'assignedTo'>[] = [
  {
    category: 'Ernährung',
    title: 'Mahlzeiten planen',
    description: 'Plant die Mahlzeiten für euer Kind im Alter von 0 bis 2 Jahren zuverlässig über den Tag.',
    thinkingTasks: ['wissen, wann das Kind essen muss', 'planen, was es heute gibt', 'Vorräte im Blick behalten'],
    doingTasks: ['Essen vorbereiten', 'Essen bereitstellen', 'bei Bedarf füttern'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Ernährung',
    title: 'Fläschchen organisieren',
    description: 'Sichert die komplette Fläschchen-Routine inklusive Verfügbarkeit und Hygiene.',
    thinkingTasks: ['genug Milch, Pulver oder Zubehör im Blick haben', 'Trinkzeiten beachten'],
    doingTasks: ['Fläschchen vorbereiten', 'reinigen', 'bereitstellen'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Ernährung',
    title: 'Snacks und Getränke für unterwegs',
    description: 'Stellt bei Terminen und Ausflügen die Versorgung unterwegs sicher.',
    thinkingTasks: ['an Ausflüge oder Termine denken', 'genug für unterwegs einplanen'],
    doingTasks: ['Tasche packen', 'Snacks vorbereiten', 'Getränke mitnehmen'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Schlaf',
    title: 'Einschlafroutine abends',
    description: 'Verantwortet die gesamte Abendroutine bis zum Einschlafen.',
    thinkingTasks: ['Schlafenszeit im Blick behalten', 'Müdigkeit erkennen'],
    doingTasks: ['Abendroutine durchführen', 'Kind ins Bett bringen'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Schlaf',
    title: 'Tagschlaf organisieren',
    description: 'Sorgt tagsüber für passende Schlafphasen und einen stimmigen Tagesrhythmus.',
    thinkingTasks: ['Schlafrhythmus im Blick behalten', 'Tagesplanung darauf abstimmen'],
    doingTasks: ['Schlafumgebung vorbereiten', 'Kind zum Schlafen bringen'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Schlaf',
    title: 'Nächtliches Aufwachen begleiten',
    description: 'Übernimmt die nächtliche Versorgung beim Aufwachen.',
    thinkingTasks: ['auf Signale achten', 'Nachtbedarf vorbereiten'],
    doingTasks: ['aufstehen', 'beruhigen', 'versorgen'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Hygiene und Pflege',
    title: 'Wickeln organisieren',
    description: 'Trägt die Verantwortung für Wickelrhythmus und Materialverfügbarkeit.',
    thinkingTasks: ['Wickelintervalle im Blick haben', 'Material rechtzeitig nachfüllen'],
    doingTasks: ['wickeln', 'Wickelplatz sauber halten'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Hygiene und Pflege',
    title: 'Baden und Körperpflege',
    description: 'Plant und übernimmt die regelmäßige Körperpflege inklusive passender Zeitfenster.',
    thinkingTasks: ['Pflegebedarf erkennen', 'geeignete Zeit einplanen'],
    doingTasks: ['baden', 'eincremen', 'Nägel oder Haare pflegen'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Hygiene und Pflege',
    title: 'Pflegeprodukte im Blick behalten',
    description: 'Sichert, dass Pflegeprodukte rechtzeitig verfügbar sind.',
    thinkingTasks: ['Creme, Tücher, Windeln, Waschmittel prüfen'],
    doingTasks: ['nachkaufen', 'einsortieren'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Gesundheit',
    title: 'Arzttermine organisieren',
    description: 'Koordiniert medizinische Vorsorge und Termine rund um das Kind.',
    thinkingTasks: ['Vorsorge, Impfungen und Kontrollen im Blick behalten'],
    doingTasks: ['Termin buchen', 'wahrnehmen', 'Unterlagen mitnehmen'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Gesundheit',
    title: 'Krankheitssituationen managen',
    description: 'Übernimmt die Struktur bei akuten Krankheitssituationen.',
    thinkingTasks: ['Symptome beobachten', 'Medikamente und Hilfsmittel im Blick halten'],
    doingTasks: ['Kind versorgen', 'Rücksprache halten', 'Medikamente geben'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Gesundheit',
    title: 'Gesundheitsunterlagen pflegen',
    description: 'Sorgt dafür, dass alle Gesundheitsdokumente vollständig und schnell greifbar sind.',
    thinkingTasks: ['Impfpass, U-Heft und Dokumente auffindbar halten'],
    doingTasks: ['Unterlagen sortieren', 'zu Terminen mitnehmen'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Organisation',
    title: 'Tagesablauf koordinieren',
    description: 'Steuert den täglichen Ablauf mit Blick auf Kind, Wege und Absprachen.',
    thinkingTasks: ['Schlaf, Essen, Termine und Wege im Blick behalten'],
    doingTasks: ['Tagesplan umsetzen', 'Absprachen treffen'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Organisation',
    title: 'Wochenplanung der Care-Aufgaben',
    description: 'Plant die nächste Woche vorausschauend für eine tragfähige Care-Verteilung.',
    thinkingTasks: ['kommende Woche gedanklich vorbereiten', 'Engpässe erkennen'],
    doingTasks: ['Aufgaben verteilen', 'Zeiten abstimmen'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Organisation',
    title: 'Betreuung abstimmen',
    description: 'Sichert, wer wann die Betreuung übernimmt und wie Übergaben laufen.',
    thinkingTasks: ['wer wann übernimmt', 'Engpässe früh erkennen'],
    doingTasks: ['Übergaben organisieren', 'Absprachen festhalten'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Haushalt mit Baby',
    title: 'Babywäsche organisieren',
    description: 'Verantwortet saubere Babywäsche und deren Verfügbarkeit.',
    thinkingTasks: ['saubere Kleidung und Schlafsachen im Blick halten'],
    doingTasks: ['waschen', 'trocknen', 'sortieren'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Haushalt mit Baby',
    title: 'Essplatz und Küchenchaos nach Baby-Mahlzeiten',
    description: 'Übernimmt die Reinigung rund um Baby-Mahlzeiten.',
    thinkingTasks: ['Reinigungsbedarf sehen'],
    doingTasks: ['sauber machen', 'Zubehör reinigen'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Haushalt mit Baby',
    title: 'Spiel- und Wohnbereich babytauglich halten',
    description: 'Sichert Ordnung und Sicherheit im Alltag mit kleinem Kind.',
    thinkingTasks: ['Sicherheit und Ordnung im Blick halten'],
    doingTasks: ['aufräumen', 'Gefahren entfernen'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Kleidung und Ausstattung',
    title: 'Passende Kleidung bereithalten',
    description: 'Stellt täglich passende Kleidung nach Wetter und Bedarf bereit.',
    thinkingTasks: ['Wetter und Größe im Blick behalten'],
    doingTasks: ['Kleidung auswählen', 'bereitlegen'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Kleidung und Ausstattung',
    title: 'Größenwechsel organisieren',
    description: 'Steuert den Übergang bei zu kleiner Kleidung.',
    thinkingTasks: ['erkennen, wenn Kleidung zu klein wird'],
    doingTasks: ['aussortieren', 'neue Sachen besorgen'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Kleidung und Ausstattung',
    title: 'Ausstattung für unterwegs pflegen',
    description: 'Hält mobile Ausstattung zuverlässig nutzbar.',
    thinkingTasks: ['Kinderwagen, Trage, Wickeltasche und Zubehör prüfen'],
    doingTasks: ['packen', 'reinigen', 'einsatzbereit halten'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Termine und Dokumente',
    title: 'Kita und Betreuungsdokumente',
    description: 'Verwaltet Unterlagen für Betreuung und Fristen.',
    thinkingTasks: ['Fristen und Unterlagen im Blick behalten'],
    doingTasks: ['Formulare ausfüllen', 'Unterlagen einreichen'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Termine und Dokumente',
    title: 'Administrative Kinderthemen',
    description: 'Übernimmt administrative Themen rund ums Kind.',
    thinkingTasks: ['Versicherungen, Anträge, Bescheinigungen im Blick behalten'],
    doingTasks: ['Unterlagen bearbeiten', 'absenden'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Termine und Dokumente',
    title: 'Familienkalender aktuell halten',
    description: 'Pflegt einen verlässlichen Überblick über Termine und Fristen.',
    thinkingTasks: ['alle Termine und Fristen sammeln'],
    doingTasks: ['eintragen', 'aktualisieren', 'erinnern'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Emotionale und soziale Care',
    title: 'Übergänge begleiten',
    description: 'Begleitet Belastungs- und Übergangssituationen emotional stabil.',
    thinkingTasks: ['erkennen, wann das Kind Ruhe oder Nähe braucht'],
    doingTasks: ['beruhigen', 'begleiten', 'Sicherheit geben'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Emotionale und soziale Care',
    title: 'Bindungszeit aktiv einplanen',
    description: 'Plant bewusst und regelmäßig ungeteilte Beziehungszeit mit dem Kind.',
    thinkingTasks: ['freie Zeit und Beziehungszeit bewusst mitdenken'],
    doingTasks: ['gemeinsame Zeit gestalten', 'ungeteilte Aufmerksamkeit geben'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Emotionale und soziale Care',
    title: 'Kontakt zu Großeltern oder Betreuungspersonen abstimmen',
    description: 'Koordiniert soziale Betreuungskontakte und deren Abstimmung.',
    thinkingTasks: ['soziale Kontakte und Absprachen im Blick halten'],
    doingTasks: ['Nachrichten schreiben', 'Besuche abstimmen'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Mental Load und Vorausplanung',
    title: 'Vorräte für das Kind vorausplanen',
    description: 'Sichert die vorausschauende Versorgung mit allem, was das Kind braucht.',
    thinkingTasks: ['Windeln, Essen, Kleidung, Medikamente und Pflege im Blick halten'],
    doingTasks: ['Liste führen', 'besorgen', 'nachfüllen'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Mental Load und Vorausplanung',
    title: 'Nächste Entwicklungsphase mitdenken',
    description: 'Bereitet anstehende Entwicklungsveränderungen rechtzeitig vor.',
    thinkingTasks: ['an neue Bedürfnisse, Schlafveränderungen oder Essensthemen denken'],
    doingTasks: ['Dinge anpassen', 'Neues vorbereiten'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
  {
    category: 'Mental Load und Vorausplanung',
    title: 'Unerledigte Care-Themen im Kopf behalten',
    description: 'Sammelt offene Care-Themen und sorgt für verbindliche Nachverfolgung.',
    thinkingTasks: ['offene Punkte sammeln und priorisieren'],
    doingTasks: ['anstoßen', 'nachfassen', 'abschließen'],
    relevanceStatus: 'active',
    ownershipStatus: 'unassigned',
  },
];

function getTimestampMillis(value: unknown) {
  if (!value || typeof value !== 'object' || !('toMillis' in value)) {
    return 0;
  }

  const toMillis = (value as { toMillis?: () => number }).toMillis;
  return typeof toMillis === 'function' ? toMillis() : 0;
}

function normalizeQuizCategory(category: string): TaskCardCategory | null {
  if (category.startsWith('Ernährung')) return 'Ernährung';
  if (category.startsWith('Schlaf') || category.startsWith('Nacht')) return 'Schlaf';
  if (category.startsWith('Hygiene') || category.startsWith('Vorrat')) return 'Hygiene und Pflege';
  if (category.startsWith('Gesundheit')) return 'Gesundheit';
  if (category.startsWith('Tagesplanung') || category.startsWith('Organisation')) return 'Organisation';
  if (category.startsWith('Haushalt')) return 'Haushalt mit Baby';
  return null;
}

function buildCategoryLoad(result: ResultDocument, firstParentId: string, secondParentId: string) {
  const loads: Record<TaskCardCategory, Record<string, number>> = {
    Ernährung: { [firstParentId]: 50, [secondParentId]: 50 },
    Schlaf: { [firstParentId]: 50, [secondParentId]: 50 },
    'Hygiene und Pflege': { [firstParentId]: 50, [secondParentId]: 50 },
    Gesundheit: { [firstParentId]: 50, [secondParentId]: 50 },
    Organisation: { [firstParentId]: 50, [secondParentId]: 50 },
    'Haushalt mit Baby': { [firstParentId]: 50, [secondParentId]: 50 },
    'Kleidung und Ausstattung': { [firstParentId]: 50, [secondParentId]: 50 },
    'Termine und Dokumente': { [firstParentId]: 50, [secondParentId]: 50 },
    'Emotionale und soziale Care': { [firstParentId]: 50, [secondParentId]: 50 },
    'Mental Load und Vorausplanung': { [firstParentId]: 50, [secondParentId]: 50 },
  };

  Object.entries(result.categoryScoresPerUser ?? {}).forEach(([rawCategory, scores]) => {
    const mapped = normalizeQuizCategory(rawCategory);
    if (!mapped) {
      return;
    }
    loads[mapped] = {
      [firstParentId]: scores[firstParentId] ?? 50,
      [secondParentId]: scores[secondParentId] ?? 50,
    };
  });

  return loads;
}

function buildCategorySatisfaction(answers: StoredQuizAnswer[], firstParentId: string, secondParentId: string) {
  const score = (value: StoredQuizAnswer['satisfaction']) => (value === 'unhappy' ? 2 : value === 'neutral' ? 1 : 0);
  const map: Partial<Record<TaskCardCategory, Record<string, number>>> = {};

  answers.forEach((answer) => {
    const category = normalizeQuizCategory(answer.category);
    if (!category) {
      return;
    }

    map[category] = map[category] ?? { [firstParentId]: 0, [secondParentId]: 0 };
    map[category]![answer.userId] = (map[category]![answer.userId] ?? 0) + score(answer.satisfaction);
  });

  return map;
}

function pickSuggestedOwner(
  category: TaskCardCategory,
  result: ResultDocument,
  answers: StoredQuizAnswer[],
): string | null {
  const [firstParentId, secondParentId] = result.userIds;
  const loadByCategory = buildCategoryLoad(result, firstParentId, secondParentId);
  const satisfactionByCategory = buildCategorySatisfaction(answers, firstParentId, secondParentId);

  const firstLoad = loadByCategory[category][firstParentId] ?? 50;
  const secondLoad = loadByCategory[category][secondParentId] ?? 50;

  const firstDissatisfaction = satisfactionByCategory[category]?.[firstParentId] ?? 0;
  const secondDissatisfaction = satisfactionByCategory[category]?.[secondParentId] ?? 0;

  const firstComposite = firstLoad + firstDissatisfaction * 3;
  const secondComposite = secondLoad + secondDissatisfaction * 3;

  return firstComposite <= secondComposite ? firstParentId : secondParentId;
}

export async function generateTaskCardsFromLatestResult(uid: string) {
  const familyId = await getCurrentUserFamilyId(uid);
  if (!familyId) {
    throw new Error('Kein Familienkonto gefunden.');
  }

  const latestResult = await loadLatestResultForFamily(familyId);
  if (!latestResult) {
    throw new Error('Keine Ergebnisse gefunden. Bitte zuerst Ergebnisse berechnen.');
  }

  const answerSnapshot = await getDocs(query(collection(db, collectionNames.quizAnswers), where('familyId', '==', familyId)));
  const answers = answerSnapshot.docs.map((item) => item.data() as StoredQuizAnswer);

  const existingSnapshot = await getDocs(query(collection(db, collectionNames.taskCards), where('familyId', '==', familyId)));
  const existingTitles = new Set(existingSnapshot.docs.map((item) => (item.data().title as string | undefined) ?? ''));

  let createdCount = 0;

  for (const template of INITIAL_TASK_CARDS) {
    if (existingTitles.has(template.title)) {
      continue;
    }

    const taskCardRef = doc(collection(db, collectionNames.taskCards));
    await setDoc(taskCardRef, {
      familyId,
      category: template.category,
      title: template.title,
      description: template.description,
      thinkingTasks: template.thinkingTasks,
      doingTasks: template.doingTasks,
      relevanceStatus: template.relevanceStatus,
      ownershipStatus: template.ownershipStatus,
      assignedTo: null,
      suggestedOwner: pickSuggestedOwner(template.category, latestResult.data, answers),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    createdCount += 1;
  }

  await updateAssignmentComparisonForFamily(familyId);

  return { createdCount };
}

export async function loadTaskCardsByFamilyId(familyId: string) {
  const cardsSnapshot = await getDocs(query(collection(db, collectionNames.taskCards), where('familyId', '==', familyId)));

  return cardsSnapshot.docs
    .map((cardDoc) => ({
      taskCardId: cardDoc.id,
      ...(cardDoc.data() as Omit<StoredTaskCard, 'createdAt' | 'updatedAt'> & { createdAt?: Timestamp; updatedAt?: Timestamp }),
    }))
    .sort((a, b) => getTimestampMillis(a.createdAt) - getTimestampMillis(b.createdAt));
}

export async function updateTaskCardDecision(
  taskCardId: string,
  payload: {
    assignedTo?: string | null;
    ownershipStatus: 'unassigned' | 'assigned' | 'discarded';
    relevanceStatus: 'active' | 'discarded';
  },
) {
  await updateDoc(doc(db, collectionNames.taskCards, taskCardId), {
    assignedTo: payload.assignedTo ?? null,
    ownershipStatus: payload.ownershipStatus,
    relevanceStatus: payload.relevanceStatus,
    updatedAt: serverTimestamp(),
  });

  const changedCardRef = doc(db, collectionNames.taskCards, taskCardId);
  const changedCardSnapshot = await getDoc(changedCardRef);
  const familyId = changedCardSnapshot.data()?.familyId as string | undefined;

  if (familyId) {
    await updateAssignmentComparisonForFamily(familyId);
  }
}
