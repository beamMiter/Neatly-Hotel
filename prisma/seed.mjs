import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const roomCount = await prisma.room.count();
  console.log(`Rooms already in database: ${roomCount}`);

  if (roomCount < 70) {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");

    const __dirname = dirname(fileURLToPath(import.meta.url));
    const layoutPath = join(__dirname, "rooms-layout.json");
    const seeds = JSON.parse(readFileSync(layoutPath, "utf8"));

    const typeRows = await prisma.roomType.findMany({
      select: { id: true, name: true },
    });
    const typeByName = new Map(typeRows.map((type) => [type.name, type.id]));

    for (const room of seeds) {
      await prisma.room.upsert({
        where: { roomNo: room.roomNo },
        create: {
          roomNo: room.roomNo,
          roomType: room.roomType,
          bedType: room.bedType,
          status: room.status,
          roomTypeId: typeByName.get(room.roomType) ?? null,
        },
        update: {
          roomType: room.roomType,
          bedType: room.bedType,
          roomTypeId: typeByName.get(room.roomType) ?? null,
        },
      });
    }

    const afterCount = await prisma.room.count();
    console.log(`Synced layout rooms: ${afterCount} total`);
  }

  const hotel = await prisma.hotelInformation.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      name: "Neatly Hotel",
      description:
        "Set in Bangkok, Thailand. Neatly Hotel offers 5-star accommodation with an outdoor pool, kids' club, sports facilities and a fitness centre. There is also a spa, an indoor pool and saunas. All units at the hotel are equipped with a seating area, a flat-screen TV with satellite channels, a dining area and a private bathroom with free toiletries, a hairdryer and shower. Every room at Neatly Hotel offers air conditioning and a desk.",
      logoUrl: "/images/logo-neatly.svg",
    },
    update: {},
  });

  if (hotel.logoUrl === "/images/logo-neatly.png") {
    await prisma.hotelInformation.update({
      where: { id: "default" },
      data: { logoUrl: "/images/logo-neatly.svg" },
    });
    console.log("Updated hotel logo path from png to svg");
  }

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
