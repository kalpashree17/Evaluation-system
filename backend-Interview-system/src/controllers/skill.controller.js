import { getAllSkills } from "../services/skill.service.js";

export const listSkills = async (ctx) => {
  const skills = await getAllSkills();

  ctx.status = 200;
  ctx.body = { success: true, data: skills };
};
