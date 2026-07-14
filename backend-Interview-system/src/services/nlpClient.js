// Contract B — Backend -> friend's NLP scoring service.
// NLP_SERVICE_URL isn't set up yet, so this returns a stub until that service exists.
export const scoreAnswer = async ({ transcriptText, referenceAnswer, keywords }) => {
  if (!process.env.NLP_SERVICE_URL) {
    return {
      keyword_score: 0.5,
      tfidf_score: 0.5,
      semantic_score: 0.5,
      final_score: 0.5,
      matched_keywords: [],
      missing_keywords: keywords || [],
      strengths: ["[stub feedback — NLP_SERVICE_URL is not configured yet]"],
      weaknesses: [],
      areas_for_improvement: [],
    };
  }

  const response = await fetch(process.env.NLP_SERVICE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript_text: transcriptText,
      reference_answer: referenceAnswer,
      keywords,
    }),
  });

  if (!response.ok) {
    throw new Error(`NLP scoring service responded with ${response.status}`);
  }

  return response.json();
};
