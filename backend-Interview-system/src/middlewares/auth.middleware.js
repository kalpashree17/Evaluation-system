import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";

export const authenticate = async (ctx, next) => {
  const authHeader = ctx.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Authentication token is required");
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    ctx.state.user = { id: payload.sub, email: payload.email, role: payload.role };
  } catch (err) {
    throw new ApiError(401, "Invalid or expired token");
  }

  await next();
};

export const authorize = (...allowedRoles) => {
  return async (ctx, next) => {
    if (!allowedRoles.includes(ctx.state.user.role)) {
      throw new ApiError(403, "You do not have permission to perform this action");
    }

    await next();
  };
};
