export type AgeGroup = '0-1' | '1-3' | '3-6' | '6-12' | '12-18';

export type MentalLoadQuestion = {
  id: string;
  category: string;
  question: string;
};

const coreQuestions: MentalLoadQuestion[] = [
  { id: 'core_1', category: 'An alles für den Alltag denken', question: 'Wer merkt zuerst, wenn etwas für den Alltag fehlt?' },
  { id: 'core_2', category: 'Routinen im Blick behalten', question: 'Wer plant Routinen wie Morgen, Abend und Übergänge?' },
  { id: 'core_3', category: 'Gesundheit im Blick behalten', question: 'Wer denkt an Vorsorge, Impfungen oder Arzttermine?' },
  { id: 'core_4', category: 'Alles rund um Termine im Kopf haben', question: 'Wer behält Termine in Kita, Schule oder Freizeit im Blick?' },
  { id: 'core_5', category: 'Unterwegs an alles denken', question: 'Wer packt gedanklich alles für unterwegs zusammen?' },
  { id: 'core_6', category: 'Entwicklung mitdenken', question: 'Wer informiert sich über nächste Entwicklungsschritte?' },
  { id: 'core_7', category: 'Haushalt fürs Kind im Blick', question: 'Wer merkt, wann Kleidung, Vorräte oder Materialien fehlen?' },
  { id: 'core_8', category: 'Für alles mitdenken', question: 'Wer wird zuerst gefragt, wenn etwas unklar ist?' },
  { id: 'core_9', category: 'An alles für den Alltag denken', question: 'Wer erinnert andere an offene Themen rund ums Kind?' },
  { id: 'core_10', category: 'Alles rund um Termine im Kopf haben', question: 'Wer koordiniert Änderungen, wenn Termine ausfallen?' },
  { id: 'core_11', category: 'Routinen im Blick behalten', question: 'Wer erkennt frühzeitig, wenn eine Routine nicht mehr passt?' },
  { id: 'core_12', category: 'Für alles mitdenken', question: 'Wer ist Standard-Ansprechpartner für Organisationsthemen?' },
];

const ageGroupQuestions: Record<AgeGroup, MentalLoadQuestion[]> = {
  '0-1': [
    { id: 'age_0_1_1', category: 'Gesundheit im Blick behalten', question: 'Wer plant U-Untersuchungen und impfbezogene Themen?' },
    { id: 'age_0_1_2', category: 'Routinen im Blick behalten', question: 'Wer denkt an Schlafrhythmus und Anpassungen?' },
  ],
  '1-3': [
    { id: 'age_1_3_1', category: 'Unterwegs an alles denken', question: 'Wer denkt an Wechselkleidung, Snacks und Trinkflasche?' },
    { id: 'age_1_3_2', category: 'Entwicklung mitdenken', question: 'Wer plant Eingewöhnung und neue Entwicklungsschritte?' },
  ],
  '3-6': [
    { id: 'age_3_6_1', category: 'Alles rund um Termine im Kopf haben', question: 'Wer koordiniert Kita-Infos, Elternabende und Aktivitäten?' },
    { id: 'age_3_6_2', category: 'Haushalt fürs Kind im Blick', question: 'Wer denkt an Bastelmaterial, Kleidung und Kita-Bedarf?' },
  ],
  '6-12': [
    { id: 'age_6_12_1', category: 'Alles rund um Termine im Kopf haben', question: 'Wer koordiniert Schule, Hausaufgaben und Freizeitpläne?' },
    { id: 'age_6_12_2', category: 'Entwicklung mitdenken', question: 'Wer plant Lernunterstützung und Entwicklungsziele?' },
  ],
  '12-18': [
    { id: 'age_12_18_1', category: 'Entwicklung mitdenken', question: 'Wer begleitet Schulentscheidungen und Zukunftsplanung?' },
    { id: 'age_12_18_2', category: 'Für alles mitdenken', question: 'Wer behält Absprachen, Fristen und Verantwortlichkeiten im Blick?' },
  ],
};

export function buildQuestionsForAgeGroups(ageGroups: AgeGroup[]) {
  const extras = ageGroups.flatMap((group) => ageGroupQuestions[group] ?? []);
  return [...coreQuestions, ...extras].slice(0, 20);
}
