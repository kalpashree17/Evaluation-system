import { AppDataSource } from "../config/data-source.js";
import { User, ROLES } from "../entities/User.schema.js";
import { registerUser } from "../services/auth.service.js";



export const seedAuth = async() => {
    const userRepo = AppDataSource.getRepository(User);

    const seedEmail = "smarika@example.com";



    const existing = await userRepo.findOne({
     where:{email: seedEmail},
    });

    if (existing) {
    console.log("✅ Seed user already exists.");
    return;
  }

if (!existing){
    registerUser({
        name: "Smarika Pokharel",
        email: seedEmail,
        password: "Smarika@123",
        role: "user",
    })
}

console.log("✅ Seed user created.");


}