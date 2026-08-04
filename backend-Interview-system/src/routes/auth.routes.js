import Router from "@koa/router";
import { register, login } from "../controllers/auth.controller.js";

const router = new Router({ prefix: "/api/auth" });

router.post("/register", register);
router.post("/login", login);

export default router;
