import { EntitySchema } from "typeorm";

 export const ROLES= ["admin", "user"];
export const User = new EntitySchema({
  name: "User",
  tableName: "users",
  columns: {
    id: {
      type: "int",
      primary: true,
      generated: true,
    },
    name: {
      type: "text",
    },
    role: {
            type: "enum",
            enum: ROLES,
            enumName: "role",
            default: "user",
    },
    email: {
      type: "text",
      unique: true,
    },
    passwordHash: {
      type: "text",
      name: "password_hash",
    },
    createdAt: {
      type: "timestamptz",
      name: "created_at",
      createDate: true,
    },
  },
});
