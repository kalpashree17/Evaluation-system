export const LEVEL_TO_DIFFICULTY = { easy: 0.2, mid: 0.5, expert: 0.85 };

export const adjustDifficulty = (current, finalScore) => {
  let delta;

  if (finalScore >= 0.75) delta = 0.2;
  else if (finalScore >= 0.55) delta = 0.05;
  else if (finalScore >= 0.35) delta = 0.0;
  else if (finalScore >= 0.2) delta = -0.1;
  else delta = -0.2;

  const next = current + delta;
  return Math.min(1.0, Math.max(0.0, next));
};
