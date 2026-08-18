import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const roomCount = await prisma.room.count();
  console.log(`Rooms already in database: ${roomCount} (left unchanged)`);

  await prisma.hotelInformation.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      name: "Neatly Hotel",
      description:
        "Set in Bangkok, Thailand. Neatly Hotel offers 5-star accommodation with an outdoor pool, kids' club, sports facilities and a fitness centre. There is also a spa, an indoor pool and saunas. All units at the hotel are equipped with a seating area, a flat-screen TV with satellite channels, a dining area and a private bathroom with free toiletries, a hairdryer and shower. Every room at Neatly Hotel offers air conditioning and a desk.",
      logoUrl: "/images/logo-neatly.png",
    },
    update: {},
  });
  console.log("Seeded hotel information");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
