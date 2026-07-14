import { AppDataSource } from "../config/data-source.js";
import { Skill } from "../entities/Skill.schema.js";

const skillRepository = () => AppDataSource.getRepository(Skill);

export const getAllSkills = async () => {
  return skillRepository().find({ order: { name: "ASC" } });
};
