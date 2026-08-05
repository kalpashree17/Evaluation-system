

import { EntitySchema } from "typeorm";

export const Question = new EntitySchema({
  name: "Question",
  tableName: "questions",
  columns: {
    id: {
      type: "int",
      primary: true,
      generated: true, // auto-increment (SERIAL): 1, 2, 3...
      // NOTE: this is the per-interview question instance id — NOT the
      // same thing as QuestionBank.id (the CSV master id, 1–75). Both are
      // plain integers now, so it's easy to mix them up. Anything sent to
      // the NLP service must use question.questionBank.id, not this id.
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