import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Optional: seed data
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
