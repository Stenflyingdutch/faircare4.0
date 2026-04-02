export const TASK_CATALOG_BY_CATEGORY: Record<string, string[]> = {
  Gesundheit: [
    'Arzttermine und Gesundheit koordinieren',
    'Vorsorgeuntersuchungen planen',
  ],
  Organisation: [
    'Termine mit Kita oder Schule im Blick halten',
    'Elternkommunikation koordinieren',
  ],
  Alltag: [
    'Alltagsvorbereitung für die Woche planen',
    'Essensplan erstellen',
    'Wocheneinkauf vorbereiten',
  ],
};

export const TASK_CATEGORIES = Object.keys(TASK_CATALOG_BY_CATEGORY);
