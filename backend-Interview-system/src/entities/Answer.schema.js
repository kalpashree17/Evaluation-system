import { EntitySchema } from "typeorm";

export const Answer = new EntitySchema({
  name: "Answer",
  tableName: "answers",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },
    transcriptText: {
      type: "text",
      name: "transcript_text",
    },
    confidenceScore: {
      type: "decimal",
      precision: 5,
      scale: 4,
      name: "confidence_score",
    },
    keywordScore: {
      type: "decimal",
      precision: 5,
      scale: 4,
      name: "keyword_score",
    },
    tfidfScore: {
      type: "decimal",
      precision: 5,
      scale: 4,
      name: "tfidf_score",
    },
    semanticScore: {
      type: "decimal",
      precision: 5,
      scale: 4,
      name: "semantic_score",
    },
    finalScore: {
      type: "decimal",
      precision: 5,
      scale: 4,
      name: "final_score",
    },
    matchedKeywords: {
      type: "text",
      array: true,
      name: "matched_keywords",
      nullable: true,
    },
    missingKeywords: {
      type: "text",
      array: true,
      name: "missing_keywords",
      nullable: true,
    },
    strengths: {
      type: "text",
      array: true,
      nullable: true,
    },
    weaknesses: {
      type: "text",
      array: true,
      nullable: true,
    },
    areasForImprovement: {
      type: "text",
      array: true,
      name: "areas_for_improvement",
      nullable: true,
    },
    createdAt: {
      type: "timestamptz",
      name: "created_at",
      createDate: true,
    },
  },
  relations: {
    question: {
      type: "one-to-one",
      target: "Question",
      joinColumn: { name: "question_id" },
      onDelete: "CASCADE",
    },
  },
});
