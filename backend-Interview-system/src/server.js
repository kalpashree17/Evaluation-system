// this file is use to connect db and start the backend

import "reflect-metadata"; //used for typeORM
import dotenv from "dotenv";
import app from "./app.js";
import { AppDataSource } from "./config/data-source.js";
import { seedSkills } from "./config/seed.js";
import { seedQuestionBank } from "./config/seedQuestionBank.js";

dotenv.config(); //this lets us to use process.env to access env files.

const PORT = process.env.PORT || 4000;

const start = async () => {
  try {
    await AppDataSource.initialize(); //this makes sure to have db connctted before any requestts and all
    console.log("Database connected");

    await seedSkills(); //re-inserts the default skills if missing, e.g. after DB_SYNC rebuilds the table
    await seedQuestionBank(); // loads question_bank rows from the CSV, safely skips existing ids

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

start();

 
