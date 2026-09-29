import "server-only";
import { supabaseAdmin } from "@/server/db/supabase-admin";
import type { NotificationItem, NotificationType } from "@/types/notifications";

const NOTIFICATION_SELECT = "id, type, message, link, read_at, created_at";

type NotificationRow = {
  id: string;
  type: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

function toNotificationItem(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    type: row.type as NotificationType,
    message: row.message,
    link: row.link,
    read: row.read_at !== null,
    createdAt: row.created_at,
  };
}

const NOTIFICATION_LIMIT = 20;

export async function getNotificationsForCustomer(customerId: string): Promise<NotificationItem[]> {
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select(NOTIFICATION_SELECT)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(NOTIFICATION_LIMIT);

  if (error || !data) {
    console.error("[notifications] failed to fetch notifications:", error);
    return [];
  }

  return (data as NotificationRow[]).map(toNotificationItem);
}

export async function markNotificationsRead(customerId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("customer_id", customerId)
    .in("id", ids)
    .is("read_at", null);

  if (error) {
    console.error("[notifications] failed to mark notifications read:", error);
  }
}

// Called from booking mutations (cancelBooking, changeBookingDates) — never
// throws, a failed notification insert shouldn't fail the booking action
// that triggered it.
export async function createNotification(
  customerId: string | null,
  type: NotificationType,
  message: string,
  link: string | null,
): Promise<void> {
  if (!customerId) return; // guest bookings have no account to notify

  const { error } = await supabaseAdmin
    .from("notifications")
    .insert({ customer_id: customerId, type, message, link });

  if (error) {
    console.error("[notifications] failed to create notification:", error);
  }
}
