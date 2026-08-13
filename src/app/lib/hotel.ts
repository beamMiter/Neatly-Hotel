export type SearchState = {
  checkIn: string | null;
  checkOut: string | null;
  guests: number | null;
  budget: number | null;
};

export type Room = {
  id: string;
  name: string;
  description: string;
  capacity: number;
  price: number;
  size: string;
  bed: string;
  available: boolean;
};

export const emptySearchState: SearchState = {
  checkIn: null,
  checkOut: null,
  guests: null,
  budget: null,
};

// ฐานข้อมูลจำลองสำหรับพัฒนา UI สามารถเปลี่ยนเป็น query จากฐานข้อมูลจริงได้ภายหลัง
const roomDatabase: Room[] = [
  {
    id: "deluxe-king",
    name: "Deluxe King",
    description: "ห้องพักโปร่งสบาย พร้อมมุมนั่งเล่นและวิวสวน",
    capacity: 2,
    price: 2800,
    size: "32 ตร.ม.",
    bed: "1 King Bed",
    available: true,
  },
  {
    id: "family-garden",
    name: "Family Garden",
    description: "พื้นที่กว้างสำหรับครอบครัว พร้อมระเบียงส่วนตัว",
    capacity: 4,
    price: 4200,
    size: "46 ตร.ม.",
    bed: "1 King + 2 Single",
    available: true,
  },
  {
    id: "neatly-suite",
    name: "Neatly Suite",
    description: "ห้องสวีทพร้อมห้องนั่งเล่นแยกเป็นสัดส่วน",
    capacity: 3,
    price: 5900,
    size: "58 ตร.ม.",
    bed: "1 King Bed",
    available: true,
  },
];

export function searchAvailableRooms(search: SearchState) {
  if (!search.guests || !search.budget) return [];

  return roomDatabase.filter(
    (room) =>
      room.available &&
      room.capacity >= search.guests! &&
      room.price <= search.budget!,
  );
}

export function getMissingSearchFields(search: SearchState) {
  const missing: Array<keyof SearchState> = [];
  if (!search.checkIn) missing.push("checkIn");
  if (!search.checkOut) missing.push("checkOut");
  if (!search.guests) missing.push("guests");
  if (!search.budget) missing.push("budget");
  return missing;
}

export function mergeSearchState(
  current: SearchState,
  extracted: Partial<SearchState>,
): SearchState {
  return {
    checkIn: extracted.checkIn ?? current.checkIn,
    checkOut: extracted.checkOut ?? current.checkOut,
    guests: extracted.guests ?? current.guests,
    budget: extracted.budget ?? current.budget,
  };
}

export function isValidDateRange(search: SearchState) {
  if (!search.checkIn || !search.checkOut) return true;
  const checkIn = Date.parse(`${search.checkIn}T00:00:00`);
  const checkOut = Date.parse(`${search.checkOut}T00:00:00`);
  return Number.isFinite(checkIn) && Number.isFinite(checkOut) && checkOut > checkIn;
}
