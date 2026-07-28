import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@kidsclub.org").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString("base64url");
  const name = process.env.ADMIN_NAME || "Admin User";

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: Role.ADMIN, activeStatus: true },
    create: { name, email, passwordHash, role: Role.ADMIN },
  });

  console.log("Admin account ready:");
  console.log(`  Email:    ${email}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log(`  Password: ${password}  (generated - store it now, it will not be shown again)`);
  } else {
    console.log("  Password: (set from ADMIN_PASSWORD env var)");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
