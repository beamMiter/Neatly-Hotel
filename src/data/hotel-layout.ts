/**
 * Neatly Hotel — physical layout (Bangkok, 5-star)
 *
 * Room types: 16 categories from Room & Property (Supabase room_types).
 * Room number = floor + sequence (e.g. 602 = floor 6, room 02).
 * Villa wing uses V-prefix (e.g. V101). Schema has no floor column.
 */

export const HOTEL_LAYOUT = {
  name: "Neatly Hotel",
  location: "Bangkok, Thailand",
  buildings: 2,
  buildingNames: ["Main Tower", "Pool Villa Wing"] as const,
  mainTower: {
    guestFloors: 11,
    floorRange: { from: 2, to: 12 },
    roomsPerFloor: 6,
    roomCount: 66,
  },
  villaWing: {
    villas: 4,
    roomCount: 4,
  },
  lobbyFloor: "G",
  totalRooms: 70,
  amenities: [
    "Outdoor pool",
    "Indoor pool & spa",
    "Fitness centre",
    "Kids' club",
    "Restaurant & bar",
    "Free Wi‑Fi",
    "Valet parking",
  ],
} as const;

/** All 16 room types — synced with Room & Property (Supabase) */
export const ROOM_TYPE_CATALOG = [
  {
    name: "Standard Room",
    basePrice: 1800,
    promotionPrice: null,
    guests: 2,
    bedType: "Double Bed",
    sizeSqm: 22,
    tier: "standard",
  },
  {
    name: "Superior",
    basePrice: 2350,
    promotionPrice: 2100,
    guests: 2,
    bedType: "Double Bed",
    sizeSqm: 26,
    tier: "standard",
  },
  {
    name: "Superior Room",
    basePrice: 2400,
    promotionPrice: 2100,
    guests: 2,
    bedType: "Double Bed",
    sizeSqm: 26,
    tier: "standard",
  },
  {
    name: "Garden View Room",
    basePrice: 2600,
    promotionPrice: 2300,
    guests: 2,
    bedType: "Double Bed",
    sizeSqm: 28,
    tier: "garden",
  },
  {
    name: "Superior Garden View",
    basePrice: 2900,
    promotionPrice: 2600,
    guests: 2,
    bedType: "Double Bed",
    sizeSqm: 30,
    tier: "garden",
  },
  {
    name: "Deluxe",
    basePrice: 3100,
    promotionPrice: 2750,
    guests: 2,
    bedType: "King Bed",
    sizeSqm: 30,
    tier: "deluxe",
  },
  {
    name: "Deluxe Room",
    basePrice: 3200,
    promotionPrice: 2800,
    guests: 2,
    bedType: "King Bed",
    sizeSqm: 32,
    tier: "deluxe",
  },
  {
    name: "Deluxe Twin Room",
    basePrice: 3200,
    promotionPrice: null,
    guests: 2,
    bedType: "Twin Beds",
    sizeSqm: 32,
    tier: "deluxe",
  },
  {
    name: "Premier Sea View",
    basePrice: 4300,
    promotionPrice: 3800,
    guests: 2,
    bedType: "Queen Bed",
    sizeSqm: 34,
    tier: "premium",
  },
  {
    name: "Premier Sea View Room",
    basePrice: 4500,
    promotionPrice: 3900,
    guests: 2,
    bedType: "Queen Bed",
    sizeSqm: 36,
    tier: "premium",
  },
  {
    name: "Supreme",
    basePrice: 5200,
    promotionPrice: 4600,
    guests: 2,
    bedType: "King Bed",
    sizeSqm: 40,
    tier: "premium",
  },
  {
    name: "Suit",
    basePrice: 6800,
    promotionPrice: 6000,
    guests: 3,
    bedType: "King Bed",
    sizeSqm: 50,
    tier: "suite",
  },
  {
    name: "Family Suite",
    basePrice: 6500,
    promotionPrice: 5800,
    guests: 4,
    bedType: "Queen Bed",
    sizeSqm: 55,
    tier: "suite",
  },
  {
    name: "Executive Suite",
    basePrice: 7800,
    promotionPrice: 6900,
    guests: 2,
    bedType: "King Bed",
    sizeSqm: 48,
    tier: "suite",
  },
  {
    name: "Honeymoon Pool Villa",
    basePrice: 12000,
    promotionPrice: 10500,
    guests: 2,
    bedType: "King Bed",
    sizeSqm: 65,
    tier: "villa",
  },
  {
    name: "Presidential Suite",
    basePrice: 18000,
    promotionPrice: 15900,
    guests: 4,
    bedType: "Super King Bed",
    sizeSqm: 90,
    tier: "suite",
  },
] as const;

export type HotelRoomType = (typeof ROOM_TYPE_CATALOG)[number]["name"];

export type LayoutRoom = {
  roomNo: string;
  building: "Main Tower" | "Pool Villa Wing";
  floor: number | null;
  roomType: HotelRoomType;
  bedType: string;
  view: string;
};

type FloorPlanEntry = {
  building: "Main Tower" | "Pool Villa Wing";
  floor: number;
  label: string;
  roomNos: string[];
  roomTypes: HotelRoomType[];
  notes: string;
};

export const FLOOR_PLAN: FloorPlanEntry[] = [
  {
    building: "Main Tower",
    floor: 2,
    label: "Standard",
    roomNos: ["201", "202", "203", "204", "205", "206"],
    roomTypes: [
      "Standard Room",
      "Standard Room",
      "Standard Room",
      "Superior",
      "Superior",
      "Superior Room",
    ],
    notes: "City-facing; closest to lobby & fitness centre",
  },
  {
    building: "Main Tower",
    floor: 3,
    label: "Standard",
    roomNos: ["301", "302", "303", "304", "305", "306"],
    roomTypes: [
      "Standard Room",
      "Standard Room",
      "Superior",
      "Superior",
      "Superior Room",
      "Superior Room",
    ],
    notes: "City-facing; twin & double layouts",
  },
  {
    building: "Main Tower",
    floor: 4,
    label: "Garden transition",
    roomNos: ["401", "402", "403", "404", "405", "406"],
    roomTypes: [
      "Superior Room",
      "Superior Room",
      "Garden View Room",
      "Garden View Room",
      "Superior Garden View",
      "Superior Garden View",
    ],
    notes: "Partial garden & courtyard views",
  },
  {
    building: "Main Tower",
    floor: 5,
    label: "Garden",
    roomNos: ["501", "502", "503", "504", "505", "506"],
    roomTypes: [
      "Garden View Room",
      "Garden View Room",
      "Garden View Room",
      "Superior Garden View",
      "Superior Garden View",
      "Superior Garden View",
    ],
    notes: "Full garden & pool terrace views",
  },
  {
    building: "Main Tower",
    floor: 6,
    label: "Garden premium",
    roomNos: ["601", "602", "603", "604", "605", "606"],
    roomTypes: [
      "Superior Garden View",
      "Superior Garden View",
      "Superior Garden View",
      "Garden View Room",
      "Deluxe",
      "Deluxe",
    ],
    notes: "Garden-view deluxe upgrades",
  },
  {
    building: "Main Tower",
    floor: 7,
    label: "Deluxe",
    roomNos: ["701", "702", "703", "704", "705", "706"],
    roomTypes: [
      "Deluxe",
      "Deluxe",
      "Deluxe Room",
      "Deluxe Room",
      "Deluxe Twin Room",
      "Deluxe Twin Room",
    ],
    notes: "King & twin deluxe layouts",
  },
  {
    building: "Main Tower",
    floor: 8,
    label: "Deluxe premium",
    roomNos: ["801", "802", "803", "804", "805", "806"],
    roomTypes: [
      "Deluxe Room",
      "Deluxe Room",
      "Deluxe Twin Room",
      "Deluxe Twin Room",
      "Premier Sea View",
      "Premier Sea View",
    ],
    notes: "Transition to river & city views",
  },
  {
    building: "Main Tower",
    floor: 9,
    label: "Premium",
    roomNos: ["901", "902", "903", "904", "905", "906"],
    roomTypes: [
      "Premier Sea View",
      "Premier Sea View",
      "Premier Sea View",
      "Premier Sea View Room",
      "Premier Sea View Room",
      "Premier Sea View Room",
    ],
    notes: "Panoramic Chao Phraya & city views",
  },
  {
    building: "Main Tower",
    floor: 10,
    label: "Premium high",
    roomNos: ["1001", "1002", "1003", "1004", "1005", "1006"],
    roomTypes: [
      "Premier Sea View Room",
      "Premier Sea View Room",
      "Premier Sea View Room",
      "Supreme",
      "Supreme",
      "Supreme",
    ],
    notes: "Corner panorama rooms with balcony",
  },
  {
    building: "Main Tower",
    floor: 11,
    label: "Suite",
    roomNos: ["1101", "1102", "1103", "1104", "1105", "1106"],
    roomTypes: [
      "Supreme",
      "Suit",
      "Suit",
      "Family Suite",
      "Family Suite",
      "Executive Suite",
    ],
    notes: "Larger layouts; lounge-access eligible",
  },
  {
    building: "Main Tower",
    floor: 12,
    label: "Penthouse",
    roomNos: ["1201", "1202", "1203", "1204", "1205", "1206"],
    roomTypes: [
      "Executive Suite",
      "Suit",
      "Family Suite",
      "Family Suite",
      "Presidential Suite",
      "Supreme",
    ],
    notes: "Top floor; presidential suite & signature views",
  },
  {
    building: "Pool Villa Wing",
    floor: 1,
    label: "Pool villas",
    roomNos: ["V101", "V102", "V103", "V104"],
    roomTypes: [
      "Honeymoon Pool Villa",
      "Honeymoon Pool Villa",
      "Honeymoon Pool Villa",
      "Honeymoon Pool Villa",
    ],
    notes: "Private pool access; ground-level garden wing",
  },
];

const CATALOG_BY_NAME = Object.fromEntries(
  ROOM_TYPE_CATALOG.map((type) => [type.name, type]),
) as Record<HotelRoomType, (typeof ROOM_TYPE_CATALOG)[number]>;

const VIEW_BY_FLOOR: Record<number, string> = {
  2: "City",
  3: "City",
  4: "Garden partial",
  5: "Garden full",
  6: "Garden full",
  7: "City & garden",
  8: "River transition",
  9: "River & city",
  10: "River & city panorama",
  11: "Executive panorama",
  12: "Penthouse panorama",
};

/** Physical room count per type — derived from FLOOR_PLAN (70 rooms, all 16 types) */
export const ROOM_TYPE_INVENTORY = FLOOR_PLAN.flatMap((f) => f.roomTypes).reduce(
  (acc, type) => {
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  },
  {} as Record<HotelRoomType, number>,
);

/** Every physical room — for seed, mock data, chatbot, or admin reference */
export const HOTEL_ROOMS: LayoutRoom[] = FLOOR_PLAN.flatMap((floorPlan) =>
  floorPlan.roomNos.map((roomNo, index) => {
    const roomType = floorPlan.roomTypes[index];
    const catalog = CATALOG_BY_NAME[roomType];
    return {
      roomNo,
      building: floorPlan.building,
      floor: floorPlan.building === "Pool Villa Wing" ? 1 : floorPlan.floor,
      roomType,
      bedType: catalog.bedType,
      view:
        floorPlan.building === "Pool Villa Wing"
          ? "Private pool & garden"
          : VIEW_BY_FLOOR[floorPlan.floor],
    };
  }),
);

export function getFloorFromRoomNo(roomNo: string): number | null {
  const trimmed = roomNo.trim();
  if (/^V\d/i.test(trimmed)) return 1;
  if (/^\d{3}$/.test(trimmed)) {
    return Number.parseInt(trimmed[0], 10);
  }
  if (/^\d{4,}$/.test(trimmed)) {
    const twoDigitFloor = Number.parseInt(trimmed.slice(0, 2), 10);
    if (twoDigitFloor >= 10) return twoDigitFloor;
    return Number.parseInt(trimmed[0], 10);
  }
  return null;
}

export function getBuildingFromRoomNo(
  roomNo: string,
): (typeof HOTEL_LAYOUT.buildingNames)[number] | null {
  const trimmed = roomNo.trim();
  if (/^V\d/i.test(trimmed)) return "Pool Villa Wing";
  if (/^\d+$/.test(trimmed)) return "Main Tower";
  return null;
}

export function getRoomsOnFloor(floor: number, building = "Main Tower"): LayoutRoom[] {
  return HOTEL_ROOMS.filter(
    (room) => room.floor === floor && room.building === building,
  );
}

export function getRoomTypesOnFloor(floor: number, building = "Main Tower"): HotelRoomType[] {
  return [...new Set(getRoomsOnFloor(floor, building).map((room) => room.roomType))];
}

export const ROOM_TYPE_COUNT = ROOM_TYPE_CATALOG.length;
