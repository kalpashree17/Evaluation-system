import { EntitySchema } from "typeorm";

export const Question = new EntitySchema({
  name: "Question",
  tableName: "questions",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
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
    orderIndex: {
      type: "int",
      name: "order_index",
    },
    createdAt: {
      type: "timestamptz",
      name: "created_at",
      createDate: true,
    },
  },
  relations: {
    interview: {
      type: "many-to-one",
      target: "Interview",
      joinColumn: { name: "interview_id" },
      onDelete: "CASCADE",
    },
    questionBank: {
      type: "many-to-one",
      target: "QuestionBank",
      joinColumn: { name: "question_bank_id" },
      nullable: true,
    },
    answer: {
      type: "one-to-one",
      target: "Answer",
      inverseSide: "question",
    },
  },
  uniques: [{ name: "uq_questions_interview_order", columns: ["interview", "orderIndex"] }],
});
