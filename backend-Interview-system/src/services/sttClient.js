import fs from "fs";

// Contract A — Backend -> Whisper/STT service.
// STT_SERVICE_URL isn't set up yet, so this returns a stub until that service exists.
export const transcribeAudio = async (audioFilePath) => {
  if (!process.env.STT_SERVICE_URL) {
    return {
      transcript_text: "[stub transcript — STT_SERVICE_URL is not configured yet]",
      confidence_score: 0.75,
    };
  }

  const audioBuffer = fs.readFileSync(audioFilePath);
  const form = new FormData();
  form.append("audio", new Blob([audioBuffer]), "answer.webm");

  const response = await fetch(process.env.STT_SERVICE_URL, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(`STT service responded with ${response.status}`);
  }

  return response.json();
};
