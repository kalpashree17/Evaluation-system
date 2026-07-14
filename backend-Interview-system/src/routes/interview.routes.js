import Router from "@koa/router";
import {
  createInterview,
  fetchInterview,
  finishInterview,
  fetchInterviewReport,
} from "../controllers/interview.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = new Router({ prefix: "/api/interviews" });

router.post("/", authenticate, createInterview);
router.get("/:id", authenticate, fetchInterview);
router.get("/:id/report", authenticate, fetchInterviewReport);
router.post("/:id/end", authenticate, finishInterview);

export default router;
