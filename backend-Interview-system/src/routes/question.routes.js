//tHIS IS BASICALLAY answers ROUTE (OF HOW THE ANSWER IS SENT TO THE BACKENDDD AFTER QUETSION IS GENENNRATED)

import Router from "@koa/router";
import { koaBody } from "koa-body";
import { answerQuestion } from "../controllers/answer.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = new Router({ prefix: "/api/questions" });

const parseMultipart = koaBody({
  multipart: true,
  formidable: { maxFileSize: 25 * 1024 * 1024 }, // 25MB
});

router.post("/:questionId/answer", authenticate, parseMultipart, answerQuestion);

export default router;


