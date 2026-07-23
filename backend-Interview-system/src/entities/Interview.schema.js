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
    // NOTE: this column is now a bit vestigial since difficulty is tracked
    // per-skill in InterviewSkillProgress. Kept for backward compatibility /
    // as the "seed" difficulty value at creation time. Not updated after
    // interview start — read from InterviewSkillProgress for live values.
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

    skills: {
      type: "many-to-many",
      target: "Skill",
      joinTable: {
        name: "interview_skills",
        joinColumn: { name: "interview_id", referencedColumnName: "id" },
        inverseJoinColumn: { name: "skill_id", referencedColumnName: "id" },
      },
    },
    skillProgress: {
      type: "one-to-many",
      target: "InterviewSkillProgress",
      inverseSide: "interview",
    },
  },
});