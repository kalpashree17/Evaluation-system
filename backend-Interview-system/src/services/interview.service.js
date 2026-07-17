import { AppDataSource } from "../config/data-source.js";
import { Interview, STARTING_LEVELS } from "../entities/Interview.schema.js";
import { Question } from "../entities/Question.schema.js";
import { Answer } from "../entities/Answer.schema.js";
import { Skill } from "../entities/Skill.schema.js";
import { QuestionBank } from "../entities/QuestionBank.schema.js";
import { ApiError } from "../utils/ApiError.js";
import { LEVEL_TO_DIFFICULTY } from "../utils/difficulty.js";
import { isUuid } from "../utils/isUuid.js";

const interviewRepository = () => AppDataSource.getRepository(Interview);
const questionRepository = () => AppDataSource.getRepository(Question);
const answerRepository = () => AppDataSource.getRepository(Answer);
const skillRepository = () => AppDataSource.getRepository(Skill);
const questionBankRepository = () => AppDataSource.getRepository(QuestionBank);

export const startInterview = async ({ userId, skillId, startingLevel }) => {
  if (!STARTING_LEVELS.includes(startingLevel)) {
    throw new ApiError(400, `starting_level must be one of: ${STARTING_LEVELS.join(", ")}`);
  }

  const skill = await skillRepository().findOne({ where: { id: skillId } });
  if (!skill) {
    throw new ApiError(404, "Skill not found");
  }

  const targetDifficulty = LEVEL_TO_DIFFICULTY[startingLevel];

  const firstQuestionBank = await questionBankRepository()
    .createQueryBuilder("qb")
    .where("qb.skill_id = :skillId", { skillId: skill.id })
    .setParameter("target", targetDifficulty)
    .orderBy("ABS(qb.difficulty_level - :target)", "ASC")
    .getOne();

  if (!firstQuestionBank) {
    throw new ApiError(404, "No questions available for this skill");
  }

  console.log("userId:", userId);
console.log("skillId:", skill.id);

  const interview = interviewRepository().create({
    user: { id: userId },
    skill: { id: skill.id },
    currentDifficulty: targetDifficulty,
    startingLevel,
  });
  await interviewRepository().save(interview);

  const question = questionRepository().create({
    interview: { id: interview.id },
    questionBank: { id: firstQuestionBank.id },
    questionText: firstQuestionBank.questionText,
    difficultyLevel: firstQuestionBank.difficultyLevel,
    orderIndex: 1,
  });
  await questionRepository().save(question);

  return {
    interview_id: interview.id,
    question: {
      id: question.id,
      question_text: question.questionText,
      difficulty_level: Number(question.difficultyLevel),
    },
  };
};

export const findInterviewOrThrow = async (interviewId) => {
  if (!isUuid(interviewId)) {
    throw new ApiError(400, "Invalid interview id");
  }

  const interview = await interviewRepository().findOne({
    where: { id: interviewId },
    relations: { user: true, skill: true },
  });
  if (!interview) {
    throw new ApiError(404, "Interview not found");
  }
  return interview;
};

export const assertOwnsInterview = (interview, userId) => {
  if (interview.user.id !== userId) {
    throw new ApiError(403, "You do not have permission to access this interview");
  }
};

export const getInterview = async ({ interviewId, userId }) => {
  const interview = await findInterviewOrThrow(interviewId);
  assertOwnsInterview(interview, userId);

  return {
    interview_id: interview.id,
    skill: interview.skill.name,
    starting_level: interview.startingLevel,
    current_difficulty: Number(interview.currentDifficulty),
    status: interview.status,
    created_at: interview.createdAt,
  };
};

// Rule: closest difficulty_level to the target, for this skill, excluding
// questions already asked in this interview.
export const pickNextQuestion = async ({ skillId, targetDifficulty, interviewId }) => {
  const askedQuestions = await questionRepository().find({
    where: { interview: { id: interviewId } },
    relations: { questionBank: true },
  });
  const askedBankIds = askedQuestions.map((q) => q.questionBank?.id).filter(Boolean);

  const qb = questionBankRepository()
    .createQueryBuilder("qb")
    .where("qb.skill_id = :skillId", { skillId });

  if (askedBankIds.length > 0) {
    qb.andWhere("qb.id NOT IN (:...askedBankIds)", { askedBankIds });
  }

  return qb
    .setParameter("target", targetDifficulty)
    .orderBy("ABS(qb.difficulty_level - :target)", "ASC")
    .getOne(); // null if no questions left for this skill
};

export const endInterview = async ({ interviewId, userId }) => {
  const interview = await findInterviewOrThrow(interviewId);
  assertOwnsInterview(interview, userId);

  if (interview.status === "completed") {
    throw new ApiError(409, "Interview has already ended");
  }

  interview.status = "completed";
  await interviewRepository().save(interview);

  const questions = await questionRepository().find({
    where: { interview: { id: interviewId } },
    order: { orderIndex: "ASC" },
  });

  const answers = await answerRepository()
    .createQueryBuilder("a")
    .innerJoinAndSelect("a.question", "q")
    .where("q.interview_id = :interviewId", { interviewId })
    .getMany();

  const scoreFields = ["confidenceScore", "keywordScore", "tfidfScore", "semanticScore", "finalScore"];
  const averages = {};
  for (const field of scoreFields) {
    const values = answers.map((a) => a[field]).filter((v) => v !== null && v !== undefined);
    averages[field] =
      values.length > 0 ? values.reduce((sum, v) => sum + Number(v), 0) / values.length : null;
  }

  const answersByQuestionId = new Map(answers.map((a) => [a.question.id, a]));

  return {
    interview_id: interview.id,
    total_questions_answered: answers.length,
    average_confidence_score: averages.confidenceScore,
    average_keyword_score: averages.keywordScore,
    average_tfidf_score: averages.tfidfScore,
    average_semantic_score: averages.semanticScore,
    average_final_score: averages.finalScore,
    per_question_scores: questions.map((q) => {
      const answer = answersByQuestionId.get(q.id);
      return {
        order_index: q.orderIndex,
        question_text: q.questionText,
        difficulty_level: Number(q.difficultyLevel),
        final_score: answer ? Number(answer.finalScore) : null,
      };
    }),
  };
};

export const getInterviewReport = async ({ interviewId, userId }) => {
  const interview = await findInterviewOrThrow(interviewId);
  assertOwnsInterview(interview, userId);

  const rows = await questionRepository()
    .createQueryBuilder("q")
    .leftJoinAndSelect("q.answer", "a")
    .where("q.interview_id = :interviewId", { interviewId })
    .orderBy("q.order_index", "ASC")
    .getMany();

  return {
    questions: rows.map((q) => ({
      order_index: q.orderIndex,
      question_text: q.questionText,
      difficulty_level: Number(q.difficultyLevel),
      transcript_text: q.answer?.transcriptText ?? null,
      confidence_score: q.answer ? Number(q.answer.confidenceScore) : null,
      keyword_score: q.answer ? Number(q.answer.keywordScore) : null,
      tfidf_score: q.answer ? Number(q.answer.tfidfScore) : null,
      semantic_score: q.answer ? Number(q.answer.semanticScore) : null,
      final_score: q.answer ? Number(q.answer.finalScore) : null,
    })),
  };
};
