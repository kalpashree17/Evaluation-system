import { EntitySchema } from "typeorm";

export const QuestionBank = new EntitySchema({
  name: "QuestionBank",
  tableName: "question_bank",
  columns: {
    id: {
      type: "varchar",
      primary: true,
      // NOT generated — this must be the exact question_id from the spreadsheet,
      // since the FastAPI service keys off the same id
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
