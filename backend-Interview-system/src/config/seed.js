import { AppDataSource } from "./data-source.js";
import { Skill, SKILL_NAMES } from "../entities/Skill.schema.js";

export const seedSkills = async () => {
  const skillRepository = AppDataSource.getRepository(Skill);

  for (const name of SKILL_NAMES) {
    const existing = await skillRepository.findOne({ where: { name } });
    if (!existing) {
      await skillRepository.save(skillRepository.create({ name }));
    }
  }
};
