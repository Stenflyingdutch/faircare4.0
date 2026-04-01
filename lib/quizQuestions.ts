export const QUIZ_CATEGORIES = [
  'Ernährung',
  'Schlaf',
  'Hygiene',
  'Gesundheit',
  'Organisation',
  'Haushalt mit Baby',
  'Mental Load',
] as const;

export type QuizCategory = (typeof QUIZ_CATEGORIES)[number];

export const QUIZ_OPTIONS = ['ich', 'partner', 'beide', 'unklar'] as const;
export type QuizOption = (typeof QUIZ_OPTIONS)[number];

export interface QuizQuestion {
  id: string;
  category: QuizCategory;
  prompt: string;
}

const categoryPrompts: Record<QuizCategory, string[]> = {
  Ernährung: [
    'plant Mahlzeiten fürs Baby',
    'bereitet Fläschchen oder Essen vor',
    'achtet auf Vorräte für Babynahrung',
    'kümmert sich um Essenszeiten',
    'führt neue Lebensmittel ein',
  ],
  Schlaf: [
    'bringt das Baby abends ins Bett',
    'übernimmt nächtliches Beruhigen',
    'achtet auf Schlafrhythmus und Nickerchen',
    'bereitet die Schlafumgebung vor',
    'reagiert zuerst bei nächtlichem Aufwachen',
  ],
  Hygiene: [
    'wechselt Windeln',
    'organisiert Baden und Körperpflege',
    'hält Wickelplatz und Pflegeartikel bereit',
    'achtet auf saubere Kleidung fürs Baby',
    'kürzt Nägel und achtet auf Hautpflege',
  ],
  Gesundheit: [
    'vereinbart Arzttermine',
    'beobachtet Krankheitssymptome',
    'verabreicht Medikamente oder Vitamine',
    'kümmert sich um Impfheft und Unterlagen',
    'entscheidet bei gesundheitlichen Fragen zuerst',
  ],
  Organisation: [
    'plant den Tagesablauf mit Baby',
    'organisiert Ausflüge und Termine',
    'koordiniert Betreuung durch Familie oder Freunde',
    'packt die Wickeltasche für unterwegs',
    'hält wichtige Dokumente griffbereit',
  ],
  'Haushalt mit Baby': [
    'wäscht Babykleidung',
    'hält Küche und Fläschchen sauber',
    'kümmert sich um Einkäufe für den Haushalt',
    'räumt Spiel- und Babybereiche auf',
    'organisiert Haushalt trotz Babyalltag',
  ],
  'Mental Load': [
    'behält alle Babyaufgaben im Blick',
    'erinnert an anstehende To-dos',
    'entscheidet Prioritäten im Familienalltag',
    'denkt an Geschenke, Feiern und besondere Termine',
    'plant vorausschauend nächste Schritte für die Familie',
  ],
};

const ALL_QUIZ_QUESTIONS: QuizQuestion[] = QUIZ_CATEGORIES.flatMap((category) =>
  categoryPrompts[category].map((prompt, index) => ({
    id: `${category.toLowerCase().replace(/\s+/g, '-')}-${index + 1}`,
    category,
    prompt,
  })),
);

export const QUIZ_QUESTIONS: QuizQuestion[] = ALL_QUIZ_QUESTIONS.slice(0, 10);
