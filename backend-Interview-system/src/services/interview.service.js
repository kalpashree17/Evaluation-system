import { In } from "typeorm";
import { AppDataSource } from "../config/data-source.js";
import { Interview, STARTING_LEVELS } from "../entities/Interview.schema.js";
import { InterviewSkillProgress } from "../entities/InterviewSkillProgress.schema.js";
import { Question } from "../entities/Question.schema.js";
import { Answer } from "../entities/Answer.schema.js";
import { Skill } from "../entities/Skill.schema.js";
import { QuestionBank } from "../entities/QuestionBank.schema.js";
import { ApiError } from "../utils/ApiError.js";
import { LEVEL_TO_DIFFICULTY, difficultyToLevel } from "../utils/difficulty.js";

const interviewRepository = () => AppDataSource.getRepository(Interview);
const progressRepository = () => AppDataSource.getRepository(InterviewSkillProgress);
const questionRepository = () => AppDataSource.getRepository(Question);
const answerRepository = () => AppDataSource.getRepository(Answer);
const skillRepository = () => AppDataSource.getRepository(Skill);
const questionBankRepository = () => AppDataSource.getRepository(QuestionBank);

// Interview.id is a plain auto-increment int (was uuid), same as
// Question.id and Answer.id — check it's a positive integer instead of
// importing isUuid.
const isPositiveInteger = (value) => /^\d+$/.test(String(value)) && Number(value) > 0;

// Starts an interview across one or more skills. Seeds a per-skill
// difficulty progress row for each selected skill (all starting at the
// same target difficulty), then picks the first question from whichever
// selected skill has the closest-matching question to that target.
export const startInterview = async ({ userId, skillIds, startingLevel }) => {
  if (!STARTING_LEVELS.includes(startingLevel)) {
    throw new ApiError(400, `starting_level must be one of: ${STARTING_LEVELS.join(", ")}`);
  }

  const skills = await skillRepository().findBy({ id: In(skillIds) });
  if (skills.length !== skillIds.length) {
    throw new ApiError(404, "One or more skills not found");
  }

  const targetDifficulty = LEVEL_TO_DIFFICULTY[startingLevel];

  // closest question across ALL selected skills' banks
  const firstQuestionBank = await questionBankRepository()
    .createQueryBuilder("qb")
    .leftJoinAndSelect("qb.skill", "skill")
    .where("qb.skill_id IN (:...skillIds)", { skillIds })
    .setParameter("target", targetDifficulty)
    .orderBy("ABS(qb.difficulty_level - :target)", "ASC")
    .addOrderBy("RANDOM()")
    .getOne();

  if (!firstQuestionBank) {
    throw new ApiError(404, "No questions available for the selected skills");
  }

  const interview = interviewRepository().create({
    user: { id: userId },
    skills: skillIds.map((id) => ({ id })),
    currentDifficulty: targetDifficulty,
    startingLevel,
  });
  await interviewRepository().save(interview);

  // seed one progress row per selected skill, all starting at the same
  // target difficulty — each will diverge independently as answers come in
  const progressRows = skillIds.map((skillId) =>
    progressRepository().create({
      interview: { id: interview.id },
      skill: { id: skillId },
      currentDifficulty: targetDifficulty,
      questionsAsked: firstQuestionBank.skill?.id === skillId ? 1 : 0,
    })
  );
  await progressRepository().save(progressRows);

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
  if (!isPositiveInteger(interviewId)) {
    throw new ApiError(400, "Invalid interview id");
  }

  const interview = await interviewRepository().findOne({
    where: { id: Number(interviewId) },
    relations: { user: true, skills: true },
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
    skills: interview.skills.map((s) => s.name),
    starting_level: interview.startingLevel,
    status: interview.status,
    created_at: interview.createdAt,
  };
};

// Round-robin (least-served-first) question selection across multiple
// skills: picks whichever selected skill has had the fewest questions
// asked so far, then within that skill picks the closest-difficulty
// question to that skill's own current difficulty, excluding anything
// already asked in this interview.
export const pickNextQuestion = async ({ interviewId, skillIds }) => {
  const progressRows = await progressRepository().find({
    where: { interview: { id: interviewId }, skill: { id: In(skillIds) } },
    relations: { skill: true },
  });

  if (progressRows.length === 0) {
    throw new ApiError(404, "No skill progress found for this interview");
  }

  // least-served-first: sort by questionsAsked ascending
  const nextProgress = progressRows.slice().sort((a, b) => a.questionsAsked - b.questionsAsked)[0];

  const askedQuestions = await questionRepository().find({
    where: { interview: { id: interviewId } },
    relations: { questionBank: true },
  });
  const askedBankIds = askedQuestions.map((q) => q.questionBank?.id).filter(Boolean);

  const qb = questionBankRepository()
    .createQueryBuilder("qb")
    .where("qb.skill_id = :skillId", { skillId: nextProgress.skill.id });

  if (askedBankIds.length > 0) {
    qb.andWhere("qb.id NOT IN (:...askedBankIds)", { askedBankIds });
  }

  const nextQuestionBank = await qb
    .setParameter("target", Number(nextProgress.currentDifficulty))
    .orderBy("ABS(qb.difficulty_level - :target)", "ASC")
    .addOrderBy("RANDOM()")
    .getOne();

  return { nextQuestionBank, progress: nextProgress };
};

export const endInterview = async ({ interviewId, userId }) => {
  const interview = await findInterviewOrThrow(interviewId);
  assertOwnsInterview(interview, userId);

  if (interview.status === "completed") {
    throw new ApiError(409, "Interview has already ended");
  }

  interview.status = "completed";
  await interviewRepository().save(interview);

  return { interview_id: interview.id, status: interview.status };
};

// Final report — grouped per skill. The "assessed level" for each skill
// comes from where that skill's difficulty trajectory settled
// (difficultyToLevel), not from a flat average score. Average score and
// average STT confidence are included as supporting context, not as the
// headline result.
export const getInterviewReport = async ({ interviewId, userId }) => {
  const interview = await findInterviewOrThrow(interviewId);
  assertOwnsInterview(interview, userId);

  const progressRows = await progressRepository().find({
    where: { interview: { id: interviewId } },
    relations: { skill: true },
  });

  const rows = await questionRepository()
    .createQueryBuilder("q")
    .leftJoinAndSelect("q.answer", "a")
    .leftJoinAndSelect("q.questionBank", "qb")
    .leftJoinAndSelect("qb.skill", "skill")
    .where("q.interview_id = :interviewId", { interviewId })
    .orderBy("q.order_index", "ASC")
    .getMany();

  const bySkillId = {};
  for (const q of rows) {
    const skillId = q.questionBank?.skill?.id;
    if (skillId == null) continue;
    if (!bySkillId[skillId]) bySkillId[skillId] = [];
    bySkillId[skillId].push(q);
  }

  const average = (nums) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null);

  const skillBreakdown = progressRows.map((progress) => {
    const questions = bySkillId[progress.skill.id] || [];

    // Only answered questions count toward either average — unanswered
    // questions (q.answer is null) are excluded rather than treated as 0.
    const scores = questions.map((q) => (q.answer ? Number(q.answer.finalScore) : null)).filter((s) => s !== null);
    const confidenceScores = questions
      .map((q) => (q.answer ? Number(q.answer.confidenceScore) : null))
      .filter((s) => s !== null);

    return {
      skill: progress.skill.name,
      final_difficulty_reached: Number(progress.currentDifficulty),
      assessed_level: difficultyToLevel(Number(progress.currentDifficulty)),
      average_score_at_that_level: average(scores),
      average_confidence_score: average(confidenceScores),
      questions_asked: questions.length,
      questions: questions.map((q) => ({
        order_index: q.orderIndex,
        question_text: q.questionText,
        difficulty_level: Number(q.difficultyLevel),
        transcript_text: q.answer?.transcriptText ?? null,
        confidence_score: q.answer ? Number(q.answer.confidenceScore) : null,
        final_score: q.answer ? Number(q.answer.finalScore) : null,
        strengths: q.answer?.strengths ?? [],
        weaknesses: q.answer?.weaknesses ?? [],
        areas_for_improvement: q.answer?.areasForImprovement ?? [],
      })),
    };
  });

  return { interview_id: interview.id, skills: skillBreakdown };
};