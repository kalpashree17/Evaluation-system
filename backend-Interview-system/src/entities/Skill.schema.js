import { EntitySchema } from "typeorm";

export const SKILL_NAMES = [
  "JavaScript",
  "React",
  "Data Structures",
  "System Design",
  "SQL",
  
];

export const Skill = new EntitySchema({
  name: "Skill",
  tableName: "skills",
  columns: {
id: {
  type: "int",
  primary: true,
  generated: true,
},
    name: {
      type: "enum",
      enum: SKILL_NAMES,
      enumName: "skill_name",
      unique: true,
    },
  },
});
