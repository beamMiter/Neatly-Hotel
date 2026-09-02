export type NotificationType = "booking_confirmed" | "booking_cancelled" | "booking_refunded" | "booking_date_changed";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};
