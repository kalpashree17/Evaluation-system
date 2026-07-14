import Router from "@koa/router";
import { listSkills } from "../controllers/skill.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = new Router({ prefix: "/api/skills" });

router.get("/", authenticate, listSkills);

// example of an admin-only route, once you have one:
// import { authorize } from "../middlewares/auth.middleware.js";
// router.post("/", authenticate, authorize("admin"), createSkill);

export default router;
