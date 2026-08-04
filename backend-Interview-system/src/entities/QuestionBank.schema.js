


import { EntitySchema } from "typeorm";

export const QuestionBank = new EntitySchema({
  name: "QuestionBank",
  tableName: "question_bank",
  columns: {
    id: {
      type: "int",
      primary: true,
      // NOT generated — this must be the exact question_id from the CSV
      // (1–75), since the NLP service keys its lookup off this same id.
    },
    questionText: {
      type: "text",
      name: "question_text",
    },
    difficultyLevel: {
      type: "numeric",
      precision: 3,
      scale: 2,
      name: "difficulty_level",
    },
  },
  relations: {
    skill: {
      type: "many-to-one",
      target: "Skill",
      joinColumn: { name: "skill_id" },
      onDelete: "CASCADE",
    },
  },
});