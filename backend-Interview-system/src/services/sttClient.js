
import fs from "fs";

// Contract A — Backend -> Whisper/STT service.
export const transcribeAudio = async (audioFilePath) => {
  if (!process.env.STT_SERVICE_URL) {
    console.warn("⚠️ STT_SERVICE_URL is not configured. Returning stub response.");

    return {
      transcript_text: "[stub transcript — STT_SERVICE_URL is not configured yet]",
      confidence_score: 0.75,
    };
  }

  console.log("=======================================");
  console.log("🎤 Starting Speech-to-Text");
  console.log("📍 STT URL:", process.env.STT_SERVICE_URL);
  console.log("📁 Audio File:", audioFilePath);
  console.log("=======================================");

  const audioBuffer = fs.readFileSync(audioFilePath);

  const form = new FormData();
  form.append("audio", new Blob([audioBuffer]), "answer.webm");

  const response = await fetch(process.env.STT_SERVICE_URL, {
    method: "POST",
    body: form,
  });

  console.log("📡 STT Response Status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();

    console.error("❌ Whisper Error:");
    console.error(errorText);

    throw new Error(
      `STT service responded with ${response.status}: ${errorText}`
    );
  }

  const data = await response.json();

  console.log("✅ Whisper Response:");
  console.log(JSON.stringify(data, null, 2));

  return data;
};