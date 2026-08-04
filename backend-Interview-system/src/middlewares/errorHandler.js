import { ApiError } from "../utils/ApiError.js";

export const errorHandler = () => async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    const status = err instanceof ApiError ? err.status : err.status || 500;

    ctx.status = status;
    ctx.body = {
      success: false,
      message: err.message || "Internal Server Error",
      ...(err.details ? { details: err.details } : {}),
    };

    ctx.app.emit("error", err, ctx);
  }
};
