
import {
  startInterview,
  getInterview,
  endInterview,
  getInterviewReport,
} from "../services/interview.service.js";
import { ApiError } from "../utils/ApiError.js";

export const createInterview = async (ctx) => {
  const { skill_ids, starting_level } = ctx.request.body;

  if (!Array.isArray(skill_ids) || skill_ids.length === 0 || !starting_level) {
    throw new ApiError(400, "skill_ids (non-empty array) and starting_level are required");
  }

  const skillIds = skill_ids.map(Number);
  if (skillIds.some((id) => !Number.isInteger(id))) {
    throw new ApiError(400, "skill_ids must all be valid ids");
  }

  const result = await startInterview({
    userId: ctx.state.user.id,
    skillIds,
    startingLevel: starting_level,
  });

  ctx.status = 201;
  ctx.body = result;
};

export const fetchInterview = async (ctx) => {
  const result = await getInterview({
    interviewId: ctx.params.id,
    userId: ctx.state.user.id,
  });

  ctx.status = 200;
  ctx.body = result;
};

export const finishInterview = async (ctx) => {
  const result = await endInterview({
    interviewId: ctx.params.id,
    userId: ctx.state.user.id,
  });

  ctx.status = 200;
  ctx.body = result;
};

export const fetchInterviewReport = async (ctx) => {
  const result = await getInterviewReport({
    interviewId: ctx.params.id,
    userId: ctx.state.user.id,
  });

  ctx.status = 200;
  ctx.body = result;
};