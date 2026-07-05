// this file is use to connect db and start the backend

import "reflect-metadata"; //used for typeORM
import dotenv from "dotenv";
import app from "./app.js";
import { AppDataSource } from "./config/data-source.js";

dotenv.config(); //this lets us to use process.env to access env files.

const PORT = process.env.PORT || 4000;

const start = async () => {
  try {
    await AppDataSource.initialize(); //this makes sure to have db connctted before any requestts and all
    console.log("Database connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

start();

 
