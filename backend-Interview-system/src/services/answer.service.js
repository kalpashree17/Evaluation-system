/*
Flow before reaching this service:

1. Frontend starts an interview by sending:
   - userId
   - skillIds (multiple skills allowed)
   - startingLevel

2. The Interview service:
   - validates the skills and starting level,
   - converts the starting level to a numeric difficulty,
   - finds the closest matching question from QuestionBank across the
     selected skills,
   - creates an Interview record,
   - seeds one InterviewSkillProgress row per selected skill,
   - creates the first Question record for that interview.

3. At this point, the frontend displays the first question to the user.

4. This service is called when the user submits an answer (as audio).
   Here we transcribe it, score it, save the answer, update THAT skill's
   difficulty progress (not the whole interview's), and determine the
   next question via round-robin across the interview's selected skills.
*/

import { AppDataSource } from "../config/data-source.js";
import { Question } from "../entities/Question.schema.js";
import { Answer } from "../entities/Answer.schema.js";
import { InterviewSkillProgress } from "../entities/InterviewSkillProgress.schema.js";
import { ApiError } from "../utils/ApiError.js";
import { adjustDifficulty } from "../utils/difficulty.js";
import { transcribeAudio } from "./sttClient.js";
import { scoreAnswer } from "./nlpClient.js";
import { pickNextQuestion } from "./interview.service.js";

const questionRepository = () => AppDataSource.getRepository(Question);
const answerRepository = () => AppDataSource.getRepository(Answer);
const progressRepository = () => AppDataSource.getRepository(InterviewSkillProgress);

// Question.id is now a plain auto-increment int (was uuid), so we just
// check it's a positive integer instead of importing isUuid.
const isPositiveInteger = (value) => /^\d+$/.test(String(value)) && Number(value) > 0;

// Turns a 0–1 confidence score into a short, human-readable message.
// Kept separate from the NLP evaluation block on purpose — confidence
// describes how clearly the speech was transcribed, not how good the
// answer's content was.
const buildTranscriptionFeedback = (confidenceScore) => {
  const pct = Math.round(Number(confidenceScore) * 100);

  let message;
  if (pct >= 85) {
    message = `Your speech was transcribed with high confidence (${pct}%).`;
  } else if (pct >= 60) {
    message = `Your speech was transcribed with moderate confidence (${pct}%). Some words may have been misheard.`;
  } else {
    message = `Your speech was transcribed with low confidence (${pct}%). Consider speaking clearly in a quiet environment.`;
  }

  return { confidence_score: pct / 100, message };
};

export const submitAnswer = async ({ questionId, userId, audioFilePath }) => {
  if (!isPositiveInteger(questionId)) {
    throw new ApiError(400, "Invalid question id");
  }
  const numericQuestionId = Number(questionId);

  const question = await questionRepository().findOne({
    where: { id: numericQuestionId },
    relations: { interview: { user: true, skills: true }, questionBank: { skill: true } },
  });

  if (!question) {
    throw new ApiError(404, "Question not found");
  }

  const { interview } = question;

  if (interview.user.id !== userId) {
    throw new ApiError(403, "You do not have permission to answer this question");
  }

  if (interview.status === "completed") {
    throw new ApiError(409, "This interview has already ended");
  }

  const existingAnswer = await answerRepository().findOne({
    where: { question: { id: question.id } },
  });

  if (existingAnswer) {
    // This question was already answered.
    // Instead of returning an error, continue the interview by
    // serving the next available question.

    const allSkillIds = interview.skills.map((s) => s.id);

    const { nextQuestionBank, progress: nextProgress } = await pickNextQuestion({
      interviewId: interview.id,
      skillIds: allSkillIds,
    });

    let nextQuestion = null;

    if (nextQuestionBank) {
      const askedCount = await questionRepository().count({
        where: { interview: { id: interview.id } },
      });

      const newQuestionRow = questionRepository().create({
        interview: { id: interview.id },
        questionBank: { id: nextQuestionBank.id },
        questionText: nextQuestionBank.questionText,
        difficultyLevel: nextQuestionBank.difficultyLevel,
        orderIndex: askedCount + 1,
      });

      await questionRepository().save(newQuestionRow);

      nextQuestion = {
        id: newQuestionRow.id,
        question_text: newQuestionRow.questionText,
        difficulty_level: Number(newQuestionRow.difficultyLevel),
        skill_id: nextProgress.skill.id,
      };
    }

    return {
      message: "This question has already been answered. Continuing with the next question.",
      next_question: nextQuestion,
    };
  }

  // Contract A: Backend -> STT/audio-analysis service
  // Send the audio to Whisper
  const stt = await transcribeAudio(audioFilePath);

  if (!question.questionBank) {
    throw new ApiError(500, "Question has no linked question bank entry — cannot score");
  }

  // Contract B (updated): Backend -> NLP scoring service
  // Only sends question_id + transcript_text  — NLP looks up its own
  // reference data. IMPORTANT: question_id here is question.questionBank.id
  // (the CSV master id, 1–75), NOT question.id (the per-interview row id).
  // Both are plain ints now, so this is easy to get wrong silently — no
  // type error will save you if you swap them.
  const nlp = await scoreAnswer({
    questionId: question.questionBank.id,
    transcriptText: stt.transcript_text,
  });

  const answer = answerRepository().create({
    question: { id: question.id },
    transcriptText: stt.transcript_text,
    confidenceScore: stt.confidence_score ?? 0,
    keywordScore: nlp.keyword_score,
    tfidfScore: nlp.tfidf_score,
    semanticScore: nlp.semantic_score,
    finalScore: nlp.final_score,
    matchedKeywords: nlp.matched_keywords,
    missingKeywords: nlp.missing_keywords,
    negatedKeywords: nlp.negated_keywords ?? [],
    strengths: nlp.strengths,
    weaknesses: nlp.weaknesses,
    areasForImprovement: nlp.areas_for_improvement,
  });
  await answerRepository().save(answer);

  if (!question.questionBank?.skill) {
    throw new ApiError(500, "Question has no linked skill — cannot update difficulty progress");
  }
  const answeredSkillId = question.questionBank.skill.id;

  const progress = await progressRepository().findOne({
    where: { interview: { id: interview.id }, skill: { id: answeredSkillId } },
  });
  if (!progress) {
    throw new ApiError(500, "Missing skill progress row for this interview/skill pair");
  }

  progress.currentDifficulty = adjustDifficulty(Number(progress.currentDifficulty), nlp.final_score);
  progress.questionsAsked += 1;
  await progressRepository().save(progress);

  // round-robin next question across ALL skills selected for this interview
  const allSkillIds = interview.skills.map((s) => s.id);
  const { nextQuestionBank, progress: nextProgress } = await pickNextQuestion({
    interviewId: interview.id,
    skillIds: allSkillIds,
  });

  let nextQuestion = null;
  if (nextQuestionBank) {
    const askedCount = await questionRepository().count({ where: { interview: { id: interview.id } } });

    const newQuestionRow = questionRepository().create({
      interview: { id: interview.id },
      questionBank: { id: nextQuestionBank.id },
      questionText: nextQuestionBank.questionText,
      difficultyLevel: nextQuestionBank.difficultyLevel,
      orderIndex: askedCount + 1,
    });
    await questionRepository().save(newQuestionRow);

    nextQuestion = {
      id: newQuestionRow.id,
      question_text: newQuestionRow.questionText,
      difficulty_level: Number(newQuestionRow.difficultyLevel),
      skill_id: nextProgress.skill.id,
    };
  }

  return {
    // Separate from `evaluation` on purpose — this is STT's read on
    // audio clarity, not a judgement of the answer's content.
    transcription: buildTranscriptionFeedback(answer.confidenceScore),
    evaluation: {
      keyword_score: Number(answer.keywordScore),
      tfidf_score: Number(answer.tfidfScore),
      semantic_score: Number(answer.semanticScore),
      final_score: Number(answer.finalScore),
      matched_keywords: answer.matchedKeywords,
      missing_keywords: answer.missingKeywords,
      negated_keywords: answer.negatedKeywords ?? [],
      strengths: answer.strengths,
      weaknesses: answer.weaknesses,
      areas_for_improvement: answer.areasForImprovement,
    },
    // null next_question means no questions left across any selected skill
    // — frontend should prompt the user to end the interview
    next_question: nextQuestion,
  };
};