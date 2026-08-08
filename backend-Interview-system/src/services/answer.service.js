

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
