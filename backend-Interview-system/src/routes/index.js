import Router from "@koa/router";
// this is the library that lets you define URL routes for Koa

import authRoutes from "./auth.routes.js";
// import the auth-specific router (handles /register, /login etc.)

import skillRoutes from "./skill.routes.js";
// import the skill-specific router (handles /api/skills)

const router = new Router();
// create the main/central router for the whole app

router.use(authRoutes.routes(), authRoutes.allowedMethods());
// mount all auth routes onto the main router

router.use(skillRoutes.routes(), skillRoutes.allowedMethods());
// mount all skill routes onto the main router
// .routes() = the actual route matching/handling logic
// .allowedMethods() = auto-handles 405/501 for unsupported HTTP methods on auth routes

export default router;
// export the main router so app.js can plug it into the Koa app