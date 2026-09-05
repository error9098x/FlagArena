import { SCORE_DECAY } from "@flagarena/shared";

export function scoreValue(
  base: number,
  previousSolves: number,
  dynamic: boolean,
  hintCost = 0,
): number {
  const value = dynamic
    ? Math.max(
        Math.ceil(base * SCORE_DECAY.MIN_RATIO),
        base - previousSolves * Math.ceil(base * SCORE_DECAY.PER_SOLVE),
      )
    : base;
  return Math.max(0, value - hintCost);
}
