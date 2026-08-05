// export const scoreAnswer = async ({
//   interviewId,
//   questionId,
//   transcriptText,
//   referenceAnswer,
//   keywords,
//   confidenceScore,
// }) => {
//   if (!process.env.NLP_SERVICE_URL) {
//     return {
//       keyword_score: 0.5,
//       tfidf_score: 0.5,
//       semantic_score: 0.5,
//       final_score: 0.5,
//       matched_keywords: [],
//       missing_keywords: keywords || [],
//       strengths: ["[stub feedback — NLP_SERVICE_URL is not configured yet]"],
//       weaknesses: [],
//       areas_for_improvement: [],
//     };
//   }

//   const payload = {
//   interview_id: interviewId,
//   question_id: questionId,
//   transcript_text: transcriptText,
//   reference_answer: referenceAnswer,
//   keywords,
//   confidence_score: confidenceScore ?? null,
// };

// console.log("Sending NLP payload:", payload);

//   const response = await fetch(process.env.NLP_SERVICE_URL, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
// body: JSON.stringify({
//   interview_id: interviewId,
//   question_id: questionId,
//   transcript_text: transcriptText,
//   reference_answer: referenceAnswer,
//   keywords: keywords || [],
//   confidence_score: confidenceScore ?? null,
// }),
//   });

//   if (!response.ok) {
//     const errorText = await response.text();
//     console.error("NLP service error:", errorText);

//     throw new Error(
//       `NLP scoring service responded with ${response.status}`
//     );
//   }

//   return response.json();
// };




export const scoreAnswer = async ({
  questionId,
  transcriptText,
}) => {
  if (!process.env.NLP_SERVICE_URL) {
    return {
      keyword_score: 0.5,
      tfidf_score: 0.5,
      semantic_score: 0.5,
      final_score: 0.5,
      matched_keywords: [],
      missing_keywords: [],
      strengths: ["[stub feedback — NLP_SERVICE_URL is not configured yet]"],
      weaknesses: [],
      areas_for_improvement: [],
    };
  }

  const payload = {
    question_id: questionId,
    transcript_text: transcriptText,
  };

  console.log("Sending NLP payload:", payload);

  const response = await fetch(process.env.NLP_SERVICE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("NLP service error:", errorText);

    throw new Error(
      `NLP scoring service responded with ${response.status}`
    );
  }

  return response.json();
};