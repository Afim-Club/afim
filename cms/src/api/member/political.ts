// Political position derived from the member's answers on political issues ("pautas").
// Each issue has a lean from -2 (agreeing leans left) to +2 (agreeing leans right). Agreeing adds the lean,
// disagreeing subtracts it and "neutral" adds nothing, so the score is in [-1, 1]. It is mapped to the
// 7 positions of the "Política" group (sortOrder 0 = extrema-esquerda ... 6 = extrema-direita).
export const POSITION_GROUP = 'Política';
export const MIN_ANSWERS = 5;

export type Stance = 'agrees' | 'disagrees' | 'neutral';
const SIGN: Record<Stance, number> = { agrees: 1, disagrees: -1, neutral: 0 };

export function positionIndex(answers: { lean: number; stance: Stance }[], positions = 7): number | null {
  if (answers.length < MIN_ANSWERS) return null;
  const weight = answers.reduce((sum, a) => sum + Math.abs(a.lean), 0);
  if (!weight) return null;
  const score = answers.reduce((sum, a) => sum + a.lean * SIGN[a.stance], 0) / weight;
  return Math.round(((score + 1) / 2) * (positions - 1));
}
