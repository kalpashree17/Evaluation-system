


export const LEVEL_TO_DIFFICULTY = { easy: 0.2, mid: 0.5, expert: 0.85 };

export const adjustDifficulty = (current, finalScore) => {
  // PostgreSQL numeric columns are returned by TypeORM as strings. Convert
  // before adding the adjustment so values such as "0.50" never become
  // the string "0.500.05" and then NaN during clamping.
  const currentDifficulty = Number(current);
  const score = Number(finalScore);

  if (!Number.isFinite(currentDifficulty) || !Number.isFinite(score)) {
    throw new Error("Cannot adjust difficulty from invalid score data");
  }

  let delta;

  if (score >= 0.75) delta = 0.2;
  else if (score >= 0.55) delta = 0.05;
  else if (score >= 0.35) delta = 0.0;
  else if (score >= 0.2) delta = -0.1;
  else delta = -0.2;

  const next = currentDifficulty + delta;
  return Math.min(1.0, Math.max(0.0, next));
};

// Reverse mapping — turns a settled difficulty value back into a level
// label for the final report. This is the user-facing "assessed level",
// derived from where the adaptive algorithm converged, not from a raw
// average score (see getInterviewReport in interview.service.js).
export const difficultyToLevel = (difficulty) => {
  if (difficulty >= 0.7) return "expert";
  if (difficulty >= 0.4) return "mid";
  return "easy";
};
