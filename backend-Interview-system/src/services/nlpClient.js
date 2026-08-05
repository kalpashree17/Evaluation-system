import { ApiError } from "../utils/ApiError.js";

const SCORE_FIELDS = ["keyword_score", "tfidf_score", "semantic_score", "final_score"];
const LIST_FIELDS = [
  "matched_keywords",
  "missing_keywords",
  "negated_keywords",
  "strengths",
  "weaknesses",
  "areas_for_improvement",
];

const validateNlpResponse = (payload, expectedQuestionId) => {
  if (!payload || typeof payload !== "object") {
    throw new ApiError(502, "NLP scoring service returned an invalid JSON response");
  }
  if (String(payload.question_id) !== String(expectedQuestionId)) {
    throw new ApiError(502, "NLP scoring service returned a response for a different question");
  }

  for (const field of SCORE_FIELDS) {
    const score = Number(payload[field]);
    if (!Number.isFinite(score) || score < 0 || score > 1) {
      throw new ApiError(502, `NLP scoring service returned an invalid ${field}`);
    }
    payload[field] = score;
  }

  for (const field of LIST_FIELDS) {
    if (!Array.isArray(payload[field]) || payload[field].some((item) => typeof item !== "string")) {
      throw new ApiError(502, `NLP scoring service returned an invalid ${field}`);
    }
  }

  return payload;
};

// Backend -> NLP: { question_id: string, transcript_text: string }.
export const scoreAnswer = async ({ questionId, transcriptText }) => {
  if (!process.env.NLP_SERVICE_URL) {
    throw new ApiError(503, "NLP_SERVICE_URL is not configured");
  }

  const payload = {
    question_id: String(questionId),
    transcript_text: String(transcriptText ?? ""),
  };

  const response = await fetch(process.env.NLP_SERVICE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(502, `NLP scoring service responded with ${response.status}: ${errorText}`);
  }

  return validateNlpResponse(await response.json(), payload.question_id);
};
