import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const requiredKeys = [
    "ADMIN_FIRST_NAME",
    "ADMIN_LAST_NAME",
    "ADMIN_COMPANY_NAME",
    "ADMIN_EMAIL",
    "ADMIN_PASSWORD",
  ] as const;

  const missingKeys = requiredKeys.filter((key) => !process.env[key]?.trim());

  if (missingKeys.length > 0) {
    console.log(
      `Skipping admin seed. Missing env vars: ${missingKeys.join(", ")}.`,
    );
    return;
  }

  const email = process.env.ADMIN_EMAIL!.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD!, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      role: UserRole.ADMIN,
      firstName: process.env.ADMIN_FIRST_NAME!.trim(),
      lastName: process.env.ADMIN_LAST_NAME!.trim(),
      companyName: process.env.ADMIN_COMPANY_NAME!.trim(),
      passwordHash,
    },
    create: {
      role: UserRole.ADMIN,
      firstName: process.env.ADMIN_FIRST_NAME!.trim(),
      lastName: process.env.ADMIN_LAST_NAME!.trim(),
      companyName: process.env.ADMIN_COMPANY_NAME!.trim(),
      email,
      passwordHash,
    },
  });

  console.log(`Seeded admin user for ${email}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
