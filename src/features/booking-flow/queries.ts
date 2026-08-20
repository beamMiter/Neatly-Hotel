import "server-only";
import { createClient } from "@/server/db/supabase-server";
import type { BookingCustomerProfile } from "@/features/booking-flow/types";

export async function getBookingCustomerProfile(userId: string): Promise<BookingCustomerProfile | null> {
  const supabase = await createClient();

  const [{ data: profile, error: profileError }, { data: authData, error: authError }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, phone, date_of_birth, country")
      .eq("id", userId)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (profileError || !profile || authError || !authData.user || authData.user.id !== userId) {
    return null;
  }

  return {
    firstName: profile.first_name,
    lastName: profile.last_name,
    email: authData.user.email ?? "",
    phone: profile.phone,
    dateOfBirth: profile.date_of_birth,
    country: profile.country,
  };
}
