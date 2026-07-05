import { registerUser, loginUser } from "../services/auth.service.js";
import { ApiError } from "../utils/ApiError.js";

export const register = async (ctx) => {
  const { name, email, password } = ctx.request.body;

  if (!name || !email || !password) {
    throw new ApiError(400, "name, email and password are required");
  }

  const user = await registerUser({ name, email, password });

  ctx.status = 201;
  ctx.body = { success: true, data: user };
};

export const login = async (ctx) => {
  const { email, password } = ctx.request.body;

  if (!email || !password) {
    throw new ApiError(400, "email and password are required");
  }

  const result = await loginUser({ email, password });

  ctx.status = 200;
  ctx.body = { success: true, data: result };
};
