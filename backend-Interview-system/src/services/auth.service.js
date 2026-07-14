import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../config/data-source.js";
import { User, ROLES } from "../entities/User.schema.js";
import { ApiError } from "../utils/ApiError.js";

const userRepository = () => AppDataSource.getRepository(User);

export const registerUser = async ({ name, email, password, role }) => {
  const existing = await userRepository().findOne({ where: { email } });
  if (existing) {
    throw new ApiError(409, "Email already registered");
  }

  if (role && !ROLES.includes(role)) {
    throw new ApiError(400, `role must be one of: ${ROLES.join(", ")}`);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = userRepository().create({
    name,
    email,
    passwordHash,
    role: role || "user",
  });
  await userRepository().save(user);

  return { id: user.id, name: user.name, email: user.email, role: user.role };
};

export const loginUser = async ({ email, password }) => {
  const user = await userRepository().findOne({ where: { email } });
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "dev_secret",
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
};
