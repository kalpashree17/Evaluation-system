import "reflect-metadata";
import { DataSource } from "typeorm";
// DataSource is TypeORM's main class for configuring and managing a database connection.
import dotenv from "dotenv";
import { User } from "../entities/User.schema.js";
import { Skill } from "../entities/Skill.schema.js";
import { QuestionBank } from "../entities/QuestionBank.schema.js";
import { Interview } from "../entities/Interview.schema.js";
import { Question } from "../entities/Question.schema.js";
import { Answer } from "../entities/Answer.schema.js";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "interview_system",
  synchronize: process.env.DB_SYNC === "true",
  logging: process.env.DB_LOGGING === "true",
  entities: [User, Skill, QuestionBank, Interview, Question, Answer],
});
