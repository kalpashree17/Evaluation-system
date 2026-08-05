// // /*
// // Flow before reaching this service:

// // 1. Frontend starts an interview by sending:
// //    - userId
// //    - skillIds (multiple skills allowed)
// //    - startingLevel

// // 2. The Interview service:
// //    - validates the skills and starting level,
// //    - converts the starting level to a numeric difficulty,
// //    - finds the closest matching question from QuestionBank across the
// //      selected skills,
// //    - creates an Interview record,
// //    - seeds one InterviewSkillProgress row per selected skill,
// //    - creates the first Question record for that interview.

// // 3. At this point, the frontend displays the first question to the user.

// // 4. This service is called when the user submits an answer (as audio).
// //    Here we transcribe it, score it, save the answer, update THAT skill's
// //    difficulty progress (not the whole interview's), and determine the
// //    next question via round-robin across the interview's selected skills.
// // */

// // import { AppDataSource } from "../config/data-source.js";
// // import { Question } from "../entities/Question.schema.js";
// // import { Answer } from "../entities/Answer.schema.js";
// // import { InterviewSkillProgress } from "../entities/InterviewSkillProgress.schema.js";
// // import { ApiError } from "../utils/ApiError.js";
// // import { adjustDifficulty } from "../utils/difficulty.js";
// // import { transcribeAudio } from "./sttClient.js";
// // import { scoreAnswer } from "./nlpClient.js";
// // import { pickNextQuestion } from "./interview.service.js";

// // const questionRepository = () => AppDataSource.getRepository(Question);
// // const answerRepository = () => AppDataSource.getRepository(Answer);
// // const progressRepository = () => AppDataSource.getRepository(InterviewSkillProgress);

// // // Question.id is now a plain auto-increment int (was uuid), so we just
// // // check it's a positive integer instead of importing isUuid.
// // const isPositiveInteger = (value) => /^\d+$/.test(String(value)) && Number(value) > 0;

// // // Turns a 0–1 confidence score into a short, human-readable message.
// // // Kept separate from the NLP evaluation block on purpose — confidence
// // // describes how clearly the speech was transcribed, not how good the
// // // answer's content was.
// // const buildTranscriptionFeedback = (confidenceScore) => {
// //   const pct = Math.round(Number(confidenceScore) * 100);

// //   let message;
// //   if (pct >= 85) {
// //     message = `Your speech was transcribed with high confidence (${pct}%).`;
// //   } else if (pct >= 60) {
// //     message = `Your speech was transcribed with moderate confidence (${pct}%). Some words may have been misheard.`;
// //   } else {
// //     message = `Your speech was transcribed with low confidence (${pct}%). Consider speaking clearly in a quiet environment.`;
// //   }

// //   return { confidence_score: pct / 100, message };
// // };

// // export const submitAnswer = async ({ questionId, userId, audioFilePath }) => {
// //   if (!isPositiveInteger(questionId)) {
// //     throw new ApiError(400, "Invalid question id");
// //   }
// //   const numericQuestionId = Number(questionId);

// //   const question = await questionRepository().findOne({
// //     where: { id: numericQuestionId },
// //     relations: { interview: { user: true, skills: true }, questionBank: { skill: true } },
// //   });

// //   if (!question) {
// //     throw new ApiError(404, "Question not found");
// //   }

// //   const { interview } = question;

// //   if (interview.user.id !== userId) {
// //     throw new ApiError(403, "You do not have permission to answer this question");
// //   }

// //   if (interview.status === "completed") {
// //     throw new ApiError(409, "This interview has already ended");
// //   }

// //   const existingAnswer = await answerRepository().findOne({
// //     where: { question: { id: question.id } },
// //   });

// //   if (existingAnswer) {
// //     // This question was already answered.
// //     // Instead of returning an error, continue the interview by
// //     // serving the next available question.

// //     const allSkillIds = interview.skills.map((s) => s.id);

// //     const { nextQuestionBank, progress: nextProgress } = await pickNextQuestion({
// //       interviewId: interview.id,
// //       skillIds: allSkillIds,
// //     });

// //     let nextQuestion = null;

// //     if (nextQuestionBank) {
// //       const askedCount = await questionRepository().count({
// //         where: { interview: { id: interview.id } },
// //       });

// //       const newQuestionRow = questionRepository().create({
// //         interview: { id: interview.id },
// //         questionBank: { id: nextQuestionBank.id },
// //         questionText: nextQuestionBank.questionText,
// //         difficultyLevel: nextQuestionBank.difficultyLevel,
// //         orderIndex: askedCount + 1,
// //       });

// //       await questionRepository().save(newQuestionRow);

// //       nextQuestion = {
// //         id: newQuestionRow.id,
// //         question_text: newQuestionRow.questionText,
// //         difficulty_level: Number(newQuestionRow.difficultyLevel),
// //         skill_id: nextProgress.skill.id,
// //       };
// //     }

// //     return {
// //       message: "This question has already been answered. Continuing with the next question.",
// //       next_question: nextQuestion,
// //     };
// //   }

// //   // Contract A: Backend -> STT/audio-analysis service
// //   // Send the audio to Whisper
// //   const stt = await transcribeAudio(audioFilePath);

// //   if (!question.questionBank) {
// //     throw new ApiError(500, "Question has no linked question bank entry — cannot score");
// //   }

// //   // Contract B (updated): Backend -> NLP scoring service
// //   // Only sends question_id + transcript_text  — NLP looks up its own
// //   // reference data. IMPORTANT: question_id here is question.questionBank.id
// //   // (the CSV master id, 1–75), NOT question.id (the per-interview row id).
// //   // Both are plain ints now, so this is easy to get wrong silently — no
// //   // type error will save you if you swap them.
// //   const nlp = await scoreAnswer({
// //     questionId: question.questionBank.id,
// //     transcriptText: stt.transcript_text,
// //   });

// //   const answer = answerRepository().create({
// //     question: { id: question.id },
// //     transcriptText: stt.transcript_text,
// //     confidenceScore: stt.confidence_score ?? 0,
// //     keywordScore: nlp.keyword_score,
// //     tfidfScore: nlp.tfidf_score,
// //     semanticScore: nlp.semantic_score,
// //     finalScore: nlp.final_score,
// //     matchedKeywords: nlp.matched_keywords,
// //     missingKeywords: nlp.missing_keywords,
// //     negatedKeywords: nlp.negated_keywords ?? [],
// //     strengths: nlp.strengths,
// //     weaknesses: nlp.weaknesses,
// //     areasForImprovement: nlp.areas_for_improvement,
// //   });
// //   await answerRepository().save(answer);

// //   if (!question.questionBank?.skill) {
// //     throw new ApiError(500, "Question has no linked skill — cannot update difficulty progress");
// //   }
// //   const answeredSkillId = question.questionBank.skill.id;

// //   const progress = await progressRepository().findOne({
// //     where: { interview: { id: interview.id }, skill: { id: answeredSkillId } },
// //   });
// //   if (!progress) {
// //     throw new ApiError(500, "Missing skill progress row for this interview/skill pair");
// //   }

// //   progress.currentDifficulty = adjustDifficulty(Number(progress.currentDifficulty), nlp.final_score);
// //   progress.questionsAsked += 1;
// //   await progressRepository().save(progress);

// //   // round-robin next question across ALL skills selected for this interview
// //   const allSkillIds = interview.skills.map((s) => s.id);
// //   const { nextQuestionBank, progress: nextProgress } = await pickNextQuestion({
// //     interviewId: interview.id,
// //     skillIds: allSkillIds,
// //   });

// //   let nextQuestion = null;
// //   if (nextQuestionBank) {
// //     const askedCount = await questionRepository().count({ where: { interview: { id: interview.id } } });

// //     const newQuestionRow = questionRepository().create({
// //       interview: { id: interview.id },
// //       questionBank: { id: nextQuestionBank.id },
// //       questionText: nextQuestionBank.questionText,
// //       difficultyLevel: nextQuestionBank.difficultyLevel,
// //       orderIndex: askedCount + 1,
// //     });
// //     await questionRepository().save(newQuestionRow);

// //     nextQuestion = {
// //       id: newQuestionRow.id,
// //       question_text: newQuestionRow.questionText,
// //       difficulty_level: Number(newQuestionRow.difficultyLevel),
// //       skill_id: nextProgress.skill.id,
// //     };
// //   }

// //   return {
// //     // Separate from `evaluation` on purpose — this is STT's read on
// //     // audio clarity, not a judgement of the answer's content.
// //     transcription: buildTranscriptionFeedback(answer.confidenceScore),
// //     evaluation: {
// //       keyword_score: Number(answer.keywordScore),
// //       tfidf_score: Number(answer.tfidfScore),
// //       semantic_score: Number(answer.semanticScore),
// //       final_score: Number(answer.finalScore),
// //       matched_keywords: answer.matchedKeywords,
// //       missing_keywords: answer.missingKeywords,
// //       negated_keywords: answer.negatedKeywords ?? [],
// //       strengths: answer.strengths,
// //       weaknesses: answer.weaknesses,
// //       areas_for_improvement: answer.areasForImprovement,
// //     },
// //     // null next_question means no questions left across any selected skill
// //     // — frontend should prompt the user to end the interview
// //     next_question: nextQuestion,
// //   };
// // };



// import { AppDataSource } from "../config/data-source.js";
// import { Question } from "../entities/Question.schema.js";
// import { Answer } from "../entities/Answer.schema.js";
// import { InterviewSkillProgress } from "../entities/InterviewSkillProgress.schema.js";
// import { ApiError } from "../utils/ApiError.js";
// import { adjustDifficulty } from "../utils/difficulty.js";
// import { transcribeAudio } from "./sttClient.js";
// import { scoreAnswer } from "./nlpClient.js";
// import { pickNextQuestion } from "./interview.service.js";

// const questionRepository = () => AppDataSource.getRepository(Question);
// const answerRepository = () => AppDataSource.getRepository(Answer);
// const progressRepository = () => AppDataSource.getRepository(InterviewSkillProgress);

// const isPositiveInteger = (value) => /^\d+$/.test(String(value)) && Number(value) > 0;

// export const submitAnswer = async ({ questionId, userId, audioFilePath }) => {
//   if (!isPositiveInteger(questionId)) {
//     throw new ApiError(400, "Invalid question id");
//   }
//   const numericQuestionId = Number(questionId);

//   const question = await questionRepository().findOne({
//     where: { id: numericQuestionId },
//     relations: { interview: { user: true, skills: true }, questionBank: { skill: true } },
//   });

//   if (!question) throw new ApiError(404, "Question not found");

//   const { interview, questionBank } = question;
//   if (interview.user.id !== userId) {
//     throw new ApiError(403, "You do not have permission to answer this question");
//   }
//   if (interview.status === "completed") {
//     throw new ApiError(409, "This interview has already ended");
//   }

//   // 1. Return Next Question directly if this question is already answered
//   const existingAnswer = await answerRepository().findOne({
//     where: { question: { id: question.id } },
//   });

//   const allSkillIds = interview.skills.map((s) => s.id);

//   if (existingAnswer) {
//     const { nextQuestionBank } = await pickNextQuestion({
//       interviewId: interview.id,
//       skillIds: allSkillIds,
//     });
//     return { nextQuestion: nextQuestionBank || null, interviewStatus: interview.status };
//   }

//   // 2. Perform speech-to-text audio transcription
//   // const { text: transcriptText, confidence: confidenceScore } = await transcribeAudio(audioFilePath);

//   const { transcript_text: transcriptText, confidence_score: confidenceScore } = await transcribeAudio(audioFilePath);

//   // 3. Process transcription text via NLP scoring service
//  const nlpResult = await scoreAnswer({
//   questionId: question.id,
//   transcriptText,
// });

//   // 4. Persist data via TypeORM entity mappings
//   const newAnswer = answerRepository().create({
//     question: { id: question.id },
//     transcriptText,
//     confidenceScore: confidenceScore,
//     keywordScore: nlpResult.keyword_score,
//     tfidfScore: nlpResult.tfidf_score,
//     semanticScore: nlpResult.semantic_score,
//     finalScore: nlpResult.final_score,
//     matchedKeywords: nlpResult.matched_keywords,
//     missingKeywords: nlpResult.missing_keywords,
//     negatedKeywords: nlpResult.negated_keywords,
//     strengths: nlpResult.strengths,
//     weaknesses: nlpResult.weaknesses,
//     areasForImprovement: nlpResult.areas_for_improvement,
//   });
//   await answerRepository().save(newAnswer);

//   // 5. Update adaptive skill difficulty progress row
//   const activeSkill = questionBank.skill;
//   const currentProgress = await progressRepository().findOne({
//     where: { interview: { id: interview.id }, skill: { id: activeSkill.id } },
//   });

//   if (currentProgress) {
//     const updatedDifficulty = adjustDifficulty(currentProgress.currentDifficulty, nlpResult.final_score);
//     currentProgress.currentDifficulty = updatedDifficulty;
//     await progressRepository().save(currentProgress);
//   }

//   // 6. Generate the next structural question round-robin
//   const { nextQuestionBank } = await pickNextQuestion({
//     interviewId: interview.id,
//     skillIds: allSkillIds,
//   });

//   let nextQuestion = null;
//   if (nextQuestionBank) {
//     const orderIndex = await questionRepository().count({ where: { interview: { id: interview.id } } });
    
//     nextQuestion = questionRepository().create({
//       interview: { id: interview.id },
//       questionBank: { id: nextQuestionBank.id },
//       questionText: nextQuestionBank.questionText,
//       difficultyLevel: nextQuestionBank.difficultyLevel,
//       order: orderIndex + 1,
//     });
//     await questionRepository().save(nextQuestion);
//   } else {
//     // End interview structure if pool is empty
//     interview.status = "completed";
//     await AppDataSource.getRepository("Interview").save(interview);
//   }

//   return {
//     scoredAnswer: newAnswer,
//     nextQuestion,
//     interviewStatus: interview.status,
//   };
// };



import { AppDataSource } from "../config/data-source.js";
import { Question } from "../entities/Question.schema.js";
import { Answer } from "../entities/Answer.schema.js";
import { InterviewSkillProgress } from "../entities/InterviewSkillProgress.schema.js";
import { Interview } from "../entities/Interview.schema.js"; 
import { ApiError } from "../utils/ApiError.js";
import { adjustDifficulty } from "../utils/difficulty.js";
import { transcribeAudio } from "./sttClient.js";
import { scoreAnswer } from "./nlpClient.js";
import { pickNextQuestion } from "./interview.service.js";

const questionRepository = () => AppDataSource.getRepository(Question);
const answerRepository = () => AppDataSource.getRepository(Answer);
const progressRepository = () => AppDataSource.getRepository(InterviewSkillProgress);
const interviewRepository = () => AppDataSource.getRepository(Interview);

const isPositiveInteger = (value) => /^\d+$/.test(String(value)) && Number(value) > 0;
const safeDecimal = (val) => val !== undefined && val !== null ? parseFloat(Number(val).toFixed(4)) : 0.0000;

const buildTranscriptionFeedback = (confidenceScore) => {
  const score = Number(confidenceScore) || 0;
  const percentage = Math.round(score * 100);
  const message = percentage >= 85
    ? `Your speech was transcribed with high confidence (${percentage}%).`
    : percentage >= 60
      ? `Your speech was transcribed with moderate confidence (${percentage}%). Some words may have been misheard.`
      : `Your speech was transcribed with low confidence (${percentage}%). Consider speaking clearly in a quiet environment.`;

  return { confidence_score: score, message };
};

const toQuestionResponse = (question, skillId) => question ? {
  id: question.id,
  question_text: question.questionText,
  difficulty_level: Number(question.difficultyLevel),
  skill_id: skillId,
} : null;

export const submitAnswer = async ({ questionId, userId, audioFilePath }) => {
  if (!isPositiveInteger(questionId)) {
    throw new ApiError(400, "Invalid question id");
  }
  const numericQuestionId = Number(questionId);

  // 1. Fetch Question and ALL deep nested relations explicitly
  const question = await questionRepository().findOne({
    where: { id: numericQuestionId },
    relations: [
      "interview",
      "interview.user",
      "interview.skills",
      "questionBank",
      "questionBank.skill"
    ]
  });

  if (!question) {
    throw new ApiError(404, "Question not found");
  }

  const { interview, questionBank } = question;

  if (!interview || !interview.user || interview.user.id !== userId) {
    throw new ApiError(403, "You do not have permission to answer this question");
  }

  if (interview.status === "completed") {
    throw new ApiError(409, "This interview has already ended");
  }

  const allSkillIds = interview.skills ? interview.skills.map((s) => s.id) : [];

  // 2. If question already answered, bypass scoring execution
  const existingAnswer = await answerRepository().findOne({
    where: { question: { id: question.id } },
  });

  if (existingAnswer) {
    const scheduledQuestion = await questionRepository()
      .createQueryBuilder("q")
      .leftJoinAndSelect("q.questionBank", "qb")
      .leftJoinAndSelect("qb.skill", "skill")
      .leftJoin("q.answer", "a")
      .where("q.interview_id = :interviewId", { interviewId: interview.id })
      .andWhere("a.id IS NULL")
      .orderBy("q.order_index", "ASC")
      .getOne();

    return {
      message: "This question has already been answered. Continuing with the next question.",
      next_question: toQuestionResponse(scheduledQuestion, scheduledQuestion?.questionBank?.skill?.id),
    };
  }

  // 3. Audio Processing & Transcription
  console.log("🎤 Starting Speech-to-Text extraction...");
  const sttResponse = await transcribeAudio(audioFilePath);
  const transcriptText = sttResponse.transcript_text || "";
  const confidenceScore = sttResponse.confidence_score || 0;

  // 4. NLP identifies questions by the master question-bank id, not this
  // per-interview Question row's auto-generated id.
  if (!questionBank?.id) {
    throw new ApiError(500, "Question is missing its question-bank mapping");
  }
  const nlpResult = await scoreAnswer({
    questionId: String(questionBank.id),
    transcriptText,
  });

  // 5. Save Structured Metric Data using clean TypeORM columns
  const newAnswer = answerRepository().create({
    question: { id: question.id },
    transcriptText,
    confidenceScore: safeDecimal(confidenceScore),
    keywordScore: safeDecimal(nlpResult.keyword_score),
    tfidfScore: safeDecimal(nlpResult.tfidf_score),
    semanticScore: safeDecimal(nlpResult.semantic_score),
    finalScore: safeDecimal(nlpResult.final_score),
    matchedKeywords: nlpResult.matched_keywords || [],
    missingKeywords: nlpResult.missing_keywords || [],
    negatedKeywords: nlpResult.negated_keywords || [],
    strengths: nlpResult.strengths || [],
    weaknesses: nlpResult.weaknesses || [],
    areasForImprovement: nlpResult.areas_for_improvement || [],
  });
  await answerRepository().save(newAnswer);

  // 6. Update Adaptive Skill Progress safely
  if (questionBank && questionBank.skill) {
    const activeSkill = questionBank.skill;
    const currentProgress = await progressRepository().findOne({
      where: { interview: { id: interview.id }, skill: { id: activeSkill.id } },
    });

    if (currentProgress) {
      const updatedDifficulty = adjustDifficulty(currentProgress.currentDifficulty, nlpResult.final_score);
      currentProgress.currentDifficulty = safeDecimal(updatedDifficulty);
      currentProgress.questionsAsked += 1;
      await progressRepository().save(currentProgress);
    }
  }

  // 7. Pick Next Question from Bank Loop
  const { nextQuestionBank, progress: nextProgress } = await pickNextQuestion({
    interviewId: interview.id,
    skillIds: allSkillIds,
  });

  let savedNextQuestion = null;
  if (nextQuestionBank) {
    const orderCount = await questionRepository().count({
      where: { interview: { id: interview.id } },
    });

    // Map properties flatly to prevent inner repository payload conversion errors
    const nextQuestionRow = questionRepository().create({
      interview: { id: interview.id },
      questionBank: { id: nextQuestionBank.id },
      questionText: nextQuestionBank.questionText,
      difficultyLevel: String(parseFloat(nextQuestionBank.difficultyLevel || 0.5).toFixed(2)),
      orderIndex: Number(orderCount) + 1, 
    });
    
    savedNextQuestion = await questionRepository().save(nextQuestionRow);
  } else {
    interview.status = "completed";
    await interviewRepository().save(interview);
  }

  return {
    transcription: buildTranscriptionFeedback(newAnswer.confidenceScore),
    evaluation: {
      keyword_score: Number(newAnswer.keywordScore),
      tfidf_score: Number(newAnswer.tfidfScore),
      semantic_score: Number(newAnswer.semanticScore),
      final_score: Number(newAnswer.finalScore),
      matched_keywords: newAnswer.matchedKeywords ?? [],
      missing_keywords: newAnswer.missingKeywords ?? [],
      negated_keywords: newAnswer.negatedKeywords ?? [],
      strengths: newAnswer.strengths ?? [],
      weaknesses: newAnswer.weaknesses ?? [],
      areas_for_improvement: newAnswer.areasForImprovement ?? [],
    },
    next_question: toQuestionResponse(savedNextQuestion, nextProgress?.skill?.id),
  };
};
