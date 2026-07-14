import fs from "fs";
import { submitAnswer } from "../services/answer.service.js";
import { ApiError } from "../utils/ApiError.js";

export const answerQuestion = async (ctx) => {
  const { questionId } = ctx.params;
  const file = ctx.request.files?.audio;

  if (!file) {
    throw new ApiError(400, "audio file is required (multipart field name: audio)");
  }

  const uploadedFile = Array.isArray(file) ? file[0] : file;

  try {
    const result = await submitAnswer({
      questionId,
      userId: ctx.state.user.id,
      audioFilePath: uploadedFile.filepath,
    });

    ctx.status = 201;
    ctx.body = result;
  } finally {
    fs.unlink(uploadedFile.filepath, () => {});
  }
};
