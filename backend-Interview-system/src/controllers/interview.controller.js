import {
  startInterview,
  getInterview,
  endInterview,
  getInterviewReport,
} from "../services/interview.service.js";
import { ApiError } from "../utils/ApiError.js";

export const createInterview = async (ctx) => {
  const { skill_id, starting_level } = ctx.request.body;

  if (!skill_id || !starting_level) {
    throw new ApiError(400, "skill_id and starting_level are required");
  }

  const skillId = Number(skill_id);
  if (!Number.isInteger(skillId)) {
    throw new ApiError(400, "skill_id must be a valid id");
  }

  const result = await startInterview({
    userId: ctx.state.user.id,
    skillId,
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
