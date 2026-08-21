import { notFound, redirect } from "next/navigation";
import { BookingFlowView } from "@/features/booking-flow/components/BookingFlowView";
import { getBookingCustomerProfile } from "@/features/booking-flow/queries";
import { defaultBookingSearchQuery } from "@/features/booking-flow/utils";
import { validateStayDates } from "@/features/booking/date-rules";
import { getGuestRoomTypeById } from "@/server/queries/booking-search.query";
import type { SearchQuery } from "@/types/room-search";
import { createClient } from "@/server/db/supabase-server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type BookingPageProps = {
  params: Promise<{ roomTypeId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function parseCount(value: string, fallback: number, max: number): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function resolveSearchQuery(raw: Record<string, string | string[] | undefined>): SearchQuery {
  const defaults = defaultBookingSearchQuery();
  const checkIn = first(raw.checkIn) || defaults.checkIn;
  const checkOut = first(raw.checkOut) || defaults.checkOut;

  return {
    checkIn,
    checkOut,
    rooms: parseCount(first(raw.rooms), defaults.rooms, 3),
    guests: parseCount(first(raw.guests), defaults.guests, 8),
  };
}

function buildRedirectPath(roomTypeId: string, search: SearchQuery) {
  const params = new URLSearchParams({
    checkIn: search.checkIn,
    checkOut: search.checkOut,
    guests: String(search.guests),
    rooms: String(search.rooms),
  });
  return `/booking/${roomTypeId}?${params.toString()}`;
}

export default async function BookingPage({ params, searchParams }: BookingPageProps) {
  const { roomTypeId } = await params;
  const rawSearch = await searchParams;

  if (!UUID_PATTERN.test(roomTypeId)) {
    notFound();
  }

  const search = resolveSearchQuery(rawSearch);
  const dateError = validateStayDates(search.checkIn, search.checkOut);
  if (dateError) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(buildRedirectPath(roomTypeId, search))}`);
  }

  const [room, profile] = await Promise.all([getGuestRoomTypeById(roomTypeId), getBookingCustomerProfile(user.id)]);

  if (!room) {
    notFound();
  }

  const initialBasicInfo = profile ?? {
    firstName: "",
    lastName: "",
    email: user.email ?? "",
    phone: "",
    dateOfBirth: "",
    country: "",
  };

  return (
    <BookingFlowView
      room={{
        id: room.id,
        name: room.name,
        guests: room.guests,
        discountedPrice: room.discountedPrice,
        fullPrice: room.fullPrice,
      }}
      search={search}
      initialBasicInfo={initialBasicInfo}
    />
  );
}
