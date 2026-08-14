import { PrismaClient } from "@prisma/client";

const BASE_ROOMS = [
  ["0001", "Superior Garden View", "Queen Bed", "Occupied"],
  ["0002", "Deluxe", "King Bed", "Assign Clean"],
  ["0003", "Superior", "Twin Beds", "Vacant Clean"],
  ["0004", "Premier Sea View", "King Bed", "Occupied Dirty"],
  ["0005", "Supreme", "Super King Bed", "Vacant Clean Inspected"],
  ["0006", "Suit", "King Bed", "Vacant Clean Pick Up"],
  ["0007", "Superior", "Double Bed", "Occupied Clean"],
  ["0008", "Superior", "Single Bed", "Assign Dirty"],
  ["0009", "Deluxe", "Twin Beds", "Out of Service"],
];

const EXTRA_STATUSES = [
  "Vacant",
  "Occupied",
  "Assign Clean",
  "Vacant Clean",
  "Occupied Dirty",
  "Vacant Clean Inspected",
  "Vacant Clean Pick Up",
  "Occupied Clean",
  "Assign Dirty",
];

const EXTRA_ROOM_TYPES = [
  "Superior Garden View",
  "Deluxe",
  "Superior",
  "Premier Sea View",
  "Supreme",
  "Suit",
];

const EXTRA_BED_TYPES = [
  "Single Bed",
  "Twin Beds",
  "Double Bed",
  "Queen Bed",
  "King Bed",
  "Super King Bed",
  "Sofa Bed",
];

const rooms = [
  ...BASE_ROOMS.map(([roomNo, roomType, bedType, status]) => ({
    roomNo,
    roomType,
    bedType,
    status,
  })),
  ...Array.from({ length: 36 }, (_, index) => {
    const roomIndex = index + 10;
    return {
      roomNo: String(roomIndex).padStart(4, "0"),
      roomType: EXTRA_ROOM_TYPES[index % EXTRA_ROOM_TYPES.length],
      bedType: EXTRA_BED_TYPES[index % EXTRA_BED_TYPES.length],
      status: EXTRA_STATUSES[index % EXTRA_STATUSES.length],
    };
  }),
];

const prisma = new PrismaClient();

async function main() {
  await prisma.room.deleteMany();
  await prisma.room.createMany({ data: rooms });
  console.log(`Seeded ${rooms.length} rooms`);

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
