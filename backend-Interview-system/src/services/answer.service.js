import { AppDataSource } from "../config/data-source.js";
import { Question } from "../entities/Question.schema.js";
import { Answer } from "../entities/Answer.schema.js";
import { Interview } from "../entities/Interview.schema.js";
import { ApiError } from "../utils/ApiError.js";
import { adjustDifficulty } from "../utils/difficulty.js";
import { isUuid } from "../utils/isUuid.js";
import { transcribeAudio } from "./sttClient.js";
import { scoreAnswer } from "./nlpClient.js";
import { getReferenceData } from "../config/questionBankData.js";
import { pickNextQuestion } from "./interview.service.js";

const questionRepository = () => AppDataSource.getRepository(Question);
const answerRepository = () => AppDataSource.getRepository(Answer);
const interviewRepository = () => AppDataSource.getRepository(Interview);

export const submitAnswer = async ({ questionId, userId, audioFilePath }) => {
  if (!isUuid(questionId)) {
    throw new ApiError(400, "Invalid question id");
  }

  const question = await questionRepository().findOne({
    where: { id: questionId },
    relations: { interview: { user: true, skill: true }, questionBank: true },
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

  const existingAnswer = await answerRepository().findOne({ where: { question: { id: question.id } } });
  if (existingAnswer) {
    throw new ApiError(409, "This question has already been answered");
  }

  // Contract A: Backend -> STT/audio-analysis service
  const stt = await transcribeAudio(audioFilePath);

  // reference_answer/keywords aren't stored in Postgres — read from the same
  // CSV question_bank was seeded from, keyed by the shared question_bank id
  const { referenceAnswer, keywords } = question.questionBank
    ? getReferenceData(question.questionBank.id)
    : { referenceAnswer: null, keywords: [] };

  // Contract B: Backend -> friend's NLP scoring service
  const nlp = await scoreAnswer({
    transcriptText: stt.transcript_text,
    referenceAnswer,
    keywords,
  });

  const answer = answerRepository().create({
    question: { id: question.id },
    transcriptText: stt.transcript_text,
    confidenceScore: stt.confidence_score,
    keywordScore: nlp.keyword_score,
    tfidfScore: nlp.tfidf_score,
    semanticScore: nlp.semantic_score,
    finalScore: nlp.final_score,
    matchedKeywords: nlp.matched_keywords,
    missingKeywords: nlp.missing_keywords,
    strengths: nlp.strengths,
    weaknesses: nlp.weaknesses,
    areasForImprovement: nlp.areas_for_improvement,
  });
  await answerRepository().save(answer);

  const newDifficulty = adjustDifficulty(Number(interview.currentDifficulty), nlp.final_score);
  interview.currentDifficulty = newDifficulty;
  await interviewRepository().save(interview);

  const bankQuestion = await pickNextQuestion({
    skillId: interview.skill.id,
    targetDifficulty: newDifficulty,
    interviewId: interview.id,
  });

  let nextQuestion = null;
  if (bankQuestion) {
    const askedCount = await questionRepository().count({ where: { interview: { id: interview.id } } });

    const newQuestionRow = questionRepository().create({
      interview: { id: interview.id },
      questionBank: { id: bankQuestion.id },
      questionText: bankQuestion.questionText,
      difficultyLevel: bankQuestion.difficultyLevel,
      orderIndex: askedCount + 1,
    });
    await questionRepository().save(newQuestionRow);

    nextQuestion = {
      id: newQuestionRow.id,
      question_text: newQuestionRow.questionText,
      difficulty_level: Number(newQuestionRow.difficultyLevel),
    };
  }

  return {
    evaluation: {
      confidence_score: Number(answer.confidenceScore),
      keyword_score: Number(answer.keywordScore),
      tfidf_score: Number(answer.tfidfScore),
      semantic_score: Number(answer.semanticScore),
      final_score: Number(answer.finalScore),
      strengths: answer.strengths,
      weaknesses: answer.weaknesses,
      areas_for_improvement: answer.areasForImprovement,
    },
    next_question: nextQuestion,
  };
};
