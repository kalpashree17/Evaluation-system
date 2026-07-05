import fs from "fs";
import { parse } from "csv-parse/sync";

// reference_answer/keywords are NOT stored in Postgres (that data belongs to
// the FastAPI side) — but Koa still needs to forward them on Contract B, so
// this reads the same CSV used to seed question_bank and caches it in memory.
let cache = null;

const load = () => {
  if (cache) return cache;

  const csvPath = new URL("../data/dataSet.csv", import.meta.url);
  const fileContent = fs.readFileSync(csvPath, "utf-8");
  const rows = parse(fileContent, { columns: true, skip_empty_lines: true });

  cache = new Map(
    rows.map((row) => [
      row.question_id,
      {
        referenceAnswer: row.reference_answer,
        keywords: safeParseKeywords(row.keywords),
      },
    ])
  );

  return cache;
};

const safeParseKeywords = (raw) => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((k) => k.term).filter(Boolean) : [];
  } catch {
    return [];
  }
};

export const getReferenceData = (questionBankId) => {
  const data = load().get(questionBankId);
  return data || { referenceAnswer: null, keywords: [] };
};
