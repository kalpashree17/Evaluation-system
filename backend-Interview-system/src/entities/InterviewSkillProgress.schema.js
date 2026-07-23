import { EntitySchema } from "typeorm";

// One row per (interview, skill) pair. Tracks that skill's difficulty
// trajectory independently, so a bad answer in Skill A doesn't affect
// the difficulty of questions asked from Skill B in the same interview.
export const InterviewSkillProgress = new EntitySchema({
  name: "InterviewSkillProgress",
  tableName: "interview_skill_progress",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },
    currentDifficulty: {
      type: "decimal",
      precision: 3,
      scale: 2,
      name: "current_difficulty",
    },
    questionsAsked: {
      type: "int",
      name: "questions_asked",
      default: 0,
    },
  },
  relations: {
    interview: {
      type: "many-to-one",
      target: "Interview",
      joinColumn: { name: "interview_id" },
      onDelete: "CASCADE",
    },
    skill: {
      type: "many-to-one",
      target: "Skill",
      joinColumn: { name: "skill_id" },
      onDelete: "CASCADE",
    },
  },
  uniques: [
    { name: "uq_interview_skill_progress", columns: ["interview", "skill"] },
  ],
});