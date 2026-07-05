import { EntitySchema } from "typeorm";

export const STARTING_LEVELS = ["easy", "mid", "expert"];
export const INTERVIEW_STATUSES = ["in_progress", "completed"];

export const Interview = new EntitySchema({
  name: "Interview",
  tableName: "interviews",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },
    startingLevel: {
      type: "enum",
      enum: STARTING_LEVELS,
      enumName: "starting_level",
      name: "starting_level",
    },
    currentDifficulty: {
      type: "decimal",
      precision: 3,
      scale: 2,
      name: "current_difficulty",
    },
    status: {
      type: "enum",
      enum: INTERVIEW_STATUSES,
      enumName: "interview_status",
      default: "in_progress",
    },
    createdAt: {
      type: "timestamptz",
      name: "created_at",
      createDate: true,
    },
  },
  relations: {
    user: {
      type: "many-to-one",
      target: "User",
      joinColumn: { name: "user_id" },
      onDelete: "CASCADE",
    },
    skill: {
      type: "many-to-one",
      target: "Skill",
      joinColumn: { name: "skill_id" },
    },
  },
});
