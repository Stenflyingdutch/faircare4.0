import type { MentalLoadAnswer } from '@/contexts/MentalLoadFlowContext';

const SCORE_MAP: Record<MentalLoadAnswer['answer'], number> = {
  ich: 1,
  eher_ich: 0.75,
  beide: 0.5,
  eher_partner: 0.25,
  partner: 0,
};

export type CategoryScore = {
  category: string;
  score: number;
  avgStress: number | null;
  highStress: boolean;
  ownershipUnclear: boolean;
};

export type SharedResultView = {
  initiatorShare: number;
  partnerShare: number;
  categoryComparisons: Array<{
    category: string;
    initiatorScore: number;
    partnerScore: number;
    diff: number;
    highDifference: boolean;
    ownershipUnclear: boolean;
    stressFlag: boolean;
  }>;
  highDifferenceCategories: string[];
  unclearOwnershipCategories: string[];
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function createEmptyIndividualResult() {
  return { totalScore: 0, categoryScores: [] as CategoryScore[], summaryBullets: [] as string[] };
}

export function calculateIndividualResult(answers: MentalLoadAnswer[]) {
  if (!answers.length) {
    return createEmptyIndividualResult();
  }

  const totalScore = round((answers.reduce((sum, a) => sum + SCORE_MAP[a.answer], 0) / answers.length) * 100);

  const grouped = new Map<string, MentalLoadAnswer[]>();
  answers.forEach((answer) => {
    const list = grouped.get(answer.category) ?? [];
    list.push(answer);
    grouped.set(answer.category, list);
  });

  const categoryScores: CategoryScore[] = Array.from(grouped.entries()).map(([category, values]) => {
    const score = round((values.reduce((sum, a) => sum + SCORE_MAP[a.answer], 0) / values.length) * 100);
    const stressValues = values.map((v) => v.stress).filter((v): v is number => typeof v === 'number');
    const avgStress = stressValues.length ? round(stressValues.reduce((sum, v) => sum + v, 0) / stressValues.length) : null;
    const highStress = stressValues.some((v) => v >= 4) || (avgStress !== null && avgStress >= 3.5);
    const nearBoth = values.filter((v) => Math.abs(SCORE_MAP[v.answer] - 0.5) <= 0.1).length;
    const ownershipUnclear = nearBoth / values.length >= 0.5;

    return { category, score, avgStress, highStress, ownershipUnclear };
  });

  const summaryBullets = [
    'Du merkst oft, wenn etwas fehlt',
    'Du behältst viele Themen im Kopf',
    'Du denkst Dinge voraus',
  ];

  return { totalScore, categoryScores, summaryBullets };
}

export function buildSharedResult(initiatorAnswers: MentalLoadAnswer[], partnerAnswers: MentalLoadAnswer[]): SharedResultView {
  const initiator = calculateIndividualResult(initiatorAnswers);
  const partner = calculateIndividualResult(partnerAnswers);

  const partnerShare = round(100 - initiator.totalScore);

  const initiatorMap = new Map(initiator.categoryScores.map((c) => [c.category, c]));
  const partnerMap = new Map(partner.categoryScores.map((c) => [c.category, c]));
  const categories = Array.from(new Set([...initiatorMap.keys(), ...partnerMap.keys()]));

  const categoryComparisons = categories.map((category) => {
    const i = initiatorMap.get(category);
    const p = partnerMap.get(category);
    const initiatorScore = i?.score ?? 50;
    const partnerScore = p?.score ?? 50;
    const diff = round(Math.abs(initiatorScore - partnerScore));
    const highDifference = diff >= 20;
    const ownershipUnclear = Boolean(i?.ownershipUnclear) && Boolean(p?.ownershipUnclear);
    const stressFlag = Boolean(i?.highStress) || Boolean(p?.highStress);

    return { category, initiatorScore, partnerScore, diff, highDifference, ownershipUnclear, stressFlag };
  });

  return {
    initiatorShare: initiator.totalScore,
    partnerShare,
    categoryComparisons,
    highDifferenceCategories: categoryComparisons.filter((c) => c.highDifference).map((c) => c.category),
    unclearOwnershipCategories: categoryComparisons.filter((c) => c.ownershipUnclear).map((c) => c.category),
  };
}
