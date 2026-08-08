import fs from "fs";
import { ApiError } from "../utils/ApiError.js";

const validateSttResponse = (payload) => {
  if (!payload || typeof payload !== "object" || typeof payload.transcript_text !== "string") {
    throw new ApiError(502, "Whisper service returned an invalid transcription response");
  }

  if (payload.confidence_score !== null && payload.confidence_score !== undefined) {
    const confidence = Number(payload.confidence_score);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      throw new ApiError(502, "Whisper service returned an invalid confidence score");
    }
    payload.confidence_score = confidence;
  }

  return payload;
};

// Backend -> Whisper: multipart/form-data field "audio".
// Whisper -> Backend: { transcript_text: string, confidence_score: number | null }.
export const transcribeAudio = async (audioFilePath) => {
  if (!process.env.STT_SERVICE_URL) {
    throw new ApiError(503, "STT_SERVICE_URL is not configured");
  }

  const audioBuffer = fs.readFileSync(audioFilePath);
  const form = new FormData();
  form.append("audio", new Blob([audioBuffer]), "answer.webm");

const response = await fetch(process.env.STT_SERVICE_URL, {
  method: "POST",
  body: form,
});

console.log("========== WHISPER RESPONSE ==========");
console.log("Status:", response.status);
console.log("Status Text:", response.statusText);
console.log("Headers:", Object.fromEntries(response.headers.entries()));

const responseText = await response.text();

console.log("Raw Response:");
console.log(responseText);
console.log("======================================");

if (!response.ok) {
  throw new ApiError(
    502,
    `Whisper service responded with ${response.status}: ${responseText}`
  );
}

let payload;

try {
  payload = JSON.parse(responseText);
} catch (err) {
  throw new ApiError(502, "Whisper service returned invalid JSON");
}

return validateSttResponse(payload);


console.log("========== WHISPER RESPONSE ==========");
    console.log("Status:", response.status);
    console.log("Status Text:", response.statusText);
    console.log("Headers:", Object.fromEntries(response.headers.entries()));

    
  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(502, `Whisper service responded with ${response.status}: ${errorText}`);
  }

  return validateSttResponse(await response.json());
};
