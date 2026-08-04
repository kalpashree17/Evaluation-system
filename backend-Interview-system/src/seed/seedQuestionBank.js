// src/config/seedQuestionBank.js
import fs from "fs";
import { parse } from "csv-parse/sync";

import { Skill } from "../entities/Skill.schema.js";
import { QuestionBank } from "../entities/QuestionBank.schema.js";
import { AppDataSource } from "../config/data-source.js";


export const seedQuestionBank = async () => {
  const skillRepo = AppDataSource.getRepository(Skill);
  const questionRepo = AppDataSource.getRepository(QuestionBank);

  const csvPath = new URL("../data/dataSet.csv", import.meta.url);
  const fileContent = fs.readFileSync(csvPath, "utf-8");

  const rows = parse(fileContent, {
    columns: true,       // use first row as headers
    skip_empty_lines: true,
  });

  for (const row of rows) {
    // find the matching Skill row by name (e.g. "JavaScript")
    const skill = await skillRepo.findOne({ where: { name: row.skill_name } });
    if (!skill) {
      console.warn(`Skipping ${row.question_id} — skill "${row.skill_name}" not found`);
      continue;
    }

    const existing = await questionRepo.findOne({ where: { id: row.question_id } });
    if (existing) continue; // idempotent — don't duplicate on restart

    await questionRepo.save(
      questionRepo.create({
        id: row.question_id,
        questionText: row.question_text,
        difficultyLevel: parseFloat(row.difficulty_level),
        skill: { id: skill.id },
      })
    );
  }

  console.log("Question bank seeded.");
};