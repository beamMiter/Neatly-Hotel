import { prisma } from "@/server/db";
import {
  DEFAULT_HOTEL_ID,
  DEFAULT_HOTEL_INFORMATION,
  type HotelInformation,
} from "@/types/hotel";

function mapHotel(row: {
  id: string;
  name: string;
  description: string;
  logoUrl: string | null;
}): HotelInformation {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    logoUrl: row.logoUrl,
  };
}

export async function getHotelInformation(): Promise<HotelInformation> {
  const existing = await prisma.hotelInformation.findUnique({
    where: { id: DEFAULT_HOTEL_ID },
  });

  if (existing) {
    return mapHotel(existing);
  }

  const created = await prisma.hotelInformation.create({
    data: DEFAULT_HOTEL_INFORMATION,
  });

  return mapHotel(created);
}

export async function updateHotelInformation(input: {
  name: string;
  description: string;
  logoUrl: string | null;
}): Promise<HotelInformation> {
  const row = await prisma.hotelInformation.upsert({
    where: { id: DEFAULT_HOTEL_ID },
    create: {
      id: DEFAULT_HOTEL_ID,
      name: input.name,
      description: input.description,
      logoUrl: input.logoUrl,
    },
    update: {
      name: input.name,
      description: input.description,
      logoUrl: input.logoUrl,
    },
  });

  return mapHotel(row);
}
