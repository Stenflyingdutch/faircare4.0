export const QUIZ_OPTIONS = ['ich', 'partner', 'beide', 'unklar'] as const;
export type QuizOption = (typeof QUIZ_OPTIONS)[number];

export const SATISFACTION_OPTIONS = ['unhappy', 'neutral', 'happy'] as const;
export type SatisfactionOption = (typeof SATISFACTION_OPTIONS)[number];

export interface QuizQuestion {
  id: string;
  category: string;
  question: string;
  thinkingActions: string[];
  doingActions: string[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'ernaehrung-1',
    category: 'Ernährung',
    question: 'Wer organisiert und übernimmt die Mahlzeiten für das Kind',
    thinkingActions: ['wissen, wann Hunger kommt', 'planen, was gegessen wird', 'Vorrat im Blick'],
    doingActions: ['Essen vorbereiten', 'Fläschchen machen', 'Essen geben'],
  },
  {
    id: 'ernaehrung-planung-1',
    category: 'Ernährung Planung',
    question: 'Wer stellt sicher, dass genug Essen für den Tag vorhanden ist',
    thinkingActions: ['Bedarf abschätzen', 'Einkauf im Kopf'],
    doingActions: ['einkaufen', 'vorbereiten'],
  },
  {
    id: 'schlaf-1',
    category: 'Schlaf',
    question: 'Wer organisiert und übernimmt die Einschlafroutine',
    thinkingActions: ['Schlafzeit im Blick', 'Routine planen'],
    doingActions: ['Kind ins Bett bringen', 'begleiten'],
  },
  {
    id: 'schlafzeiten-1',
    category: 'Schlafzeiten',
    question: 'Wer sorgt dafür, dass Schlafenszeiten eingehalten werden',
    thinkingActions: ['Uhr im Blick', 'Müdigkeit erkennen'],
    doingActions: ['aktiv ins Bett bringen'],
  },
  {
    id: 'nacht-1',
    category: 'Nacht',
    question: 'Wer reagiert nachts, wenn das Kind aufwacht',
    thinkingActions: ['aufmerksam bleiben', 'Geräusche wahrnehmen'],
    doingActions: ['aufstehen', 'beruhigen'],
  },
  {
    id: 'hygiene-1',
    category: 'Hygiene',
    question: 'Wer organisiert und übernimmt Pflege und Wickeln',
    thinkingActions: ['Bedarf erkennen', 'Zeitpunkte im Kopf'],
    doingActions: ['wickeln', 'waschen'],
  },
  {
    id: 'vorrat-1',
    category: 'Vorrat',
    question: 'Wer sorgt dafür, dass Windeln und Kleidung vorhanden sind',
    thinkingActions: ['Vorrat prüfen', 'Bedarf sehen'],
    doingActions: ['kaufen', 'vorbereiten'],
  },
  {
    id: 'gesundheit-1',
    category: 'Gesundheit',
    question: 'Wer organisiert Arzttermine und Gesundheitsthemen',
    thinkingActions: ['Termine im Kopf', 'Symptome beobachten'],
    doingActions: ['Termin buchen', 'hingehen'],
  },
  {
    id: 'tagesplanung-1',
    category: 'Tagesplanung',
    question: 'Wer plant und koordiniert den Tagesablauf',
    thinkingActions: ['Struktur planen', 'Bedürfnisse im Blick'],
    doingActions: ['Ablauf umsetzen'],
  },
  {
    id: 'haushalt-1',
    category: 'Haushalt',
    question: 'Wer organisiert und erledigt die Wäsche des Kindes',
    thinkingActions: ['sehen, was fehlt', 'planen'],
    doingActions: ['waschen', 'sortieren'],
  },
];

export type QuizCategory = (typeof QUIZ_QUESTIONS)[number]['category'];
