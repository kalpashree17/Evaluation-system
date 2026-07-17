// src/seed/index.js

import dotenv from "dotenv";
import "reflect-metadata";


import { seedSkills } from "./seedSkills.js";
import { seedQuestionBank } from "./seedQuestionBank.js";
import { AppDataSource } from "../config/data-source.js";
import { seedAuth } from "./seedAuth.js";


dotenv.config();

const seed = async () => {
  try {
    await AppDataSource.initialize();
    console.log("✅ Database connected");

    console.log("🌱 Seeding User...");
    await seedAuth();

    console.log("🌱 Seeding skills...");
    await seedSkills();//re-inserts the default skills if missing, e.g. after DB_SYNC rebuilds the table

    console.log("🌱 Seeding question bank...");
    await seedQuestionBank();// loads question_bank rows from the CSV, safely skips existing ids

    console.log("✅ Database seeded successfully");

    await AppDataSource.destroy();
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }

    process.exit(1);
  }
};

seed();

