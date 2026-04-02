export const QUIZ_OPTIONS = ['ich', 'eher_ich', 'beide', 'eher_partner', 'partner'] as const;
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
    id: 'alltag-1',
    category: 'An alles für den Alltag denken',
    question: 'Wer merkt zuerst, wenn wichtige Dinge für den Tag fehlen?',
    thinkingActions: ['vorausplanen', 'Vorrat im Blick behalten'],
    doingActions: ['besorgen', 'organisieren'],
  },
  {
    id: 'routine-1',
    category: 'Routinen im Blick behalten',
    question: 'Wer strukturiert Morgen- und Abendroutinen im Familienalltag?',
    thinkingActions: ['Abläufe planen', 'Abweichungen erkennen'],
    doingActions: ['Ablauf anstoßen', 'erinnern'],
  },
  {
    id: 'gesundheit-1',
    category: 'Gesundheit im Blick behalten',
    question: 'Wer denkt an Vorsorge, Termine und gesundheitliche Themen?',
    thinkingActions: ['Fristen merken', 'Informationen sammeln'],
    doingActions: ['Arzttermine buchen', 'Begleitung'],
  },
];

export type QuizCategory = (typeof QUIZ_QUESTIONS)[number]['category'];
