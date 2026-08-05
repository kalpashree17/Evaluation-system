



// // import fs from "fs";
// // import { submitAnswer } from "../services/answer.service.js";
// // import { ApiError } from "../utils/ApiError.js";

// // export const answerQuestion = async (ctx) => {
// //   const { questionId } = ctx.params;
// //   const file = ctx.request.files?.audio;

// //   if (!file) {
// //     throw new ApiError(400, "audio file is required (multipart field name: audio)");
// //   }

// //   const uploadedFile = Array.isArray(file) ? file[0] : file;

// //   try {
// //     const result = await submitAnswer({
// //       questionId,
// //       userId: ctx.state.user.id,
// //       audioFilePath: uploadedFile.filepath,
// //     });

// //     ctx.status = 201;
// //     ctx.body = result;
// //   } finally {
// //     fs.unlink(uploadedFile.filepath, () => {});
// //   }
// // };



// import { submitAnswer } from "../services/answer.service.js";

// export const answerQuestion = async (ctx) => {
//   const { questionId } = ctx.params;
//   const userId = ctx.state.user.id; // populated by authenticate middleware
  
//   // Extract file uploaded via multipart/form-data parse middleware
//   const audioFile = ctx.request.files?.audio;

//   if (!audioFile) {
//     ctx.status = 400;
//     ctx.body = { error: "Missing required audio payload file field named 'audio'" };
//     return;
//   }

//   try {
//     const result = await submitAnswer({
//       questionId,
//       userId,
//       audioFilePath: audioFile.filepath || audioFile.path, // handles compatibility
//     });

//     ctx.status = 201;
//     ctx.body = result;
//   } catch (error) {
//     if (error.statusCode) { // ApiError instance check
//       ctx.status = error.statusCode;
//       ctx.body = { error: error.message };
//     } else {
//       console.error("Unhandled Answer Endpoint Crash:", error);
//       ctx.status = 500;
//       ctx.body = { error: "Internal Server Processing Error" };
//     }
//   }
// };

import { submitAnswer } from "../services/answer.service.js";

export const answerQuestion = async (ctx) => {
  const { questionId } = ctx.params;
  const userId = ctx.state.user.id;
  const audioFile = ctx.request.files?.audio;

  if (!audioFile) {
    ctx.status = 400;
    ctx.body = { error: "Missing required audio file field payload named 'audio'." };
    return;
  }

  try {
    const result = await submitAnswer({
      questionId,
      userId,
      audioFilePath: audioFile.filepath || audioFile.path,
    });

    ctx.status = 201;
    ctx.body = result;
  } catch (error) {
    const status = error.status ?? error.statusCode;

    if (status) {
      ctx.status = status;
      ctx.body = { error: error.message };
    } else {
      console.error("Unhandled Answer Endpoint Crash:", error);
      ctx.status = 500;
      ctx.body = { error: "Internal Server Processing Error" };
    }
  }
};
