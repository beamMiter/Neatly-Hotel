// Mock booking history — relative to `now` so 24h action states stay valid.
// Replace with src/server/queries once the customer bookings API exists.

import type { BookingHistoryItem } from "@/types/booking";

function hoursAgo(now: Date, hours: number): string {
  return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
}

function bangkokDateOffset(now: Date, days: number): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [year, month, day] = today.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function createMockBookingHistory(now = new Date()): BookingHistoryItem[] {
  return [
    {
      id: "bh-1",
      bookingCode: "NLY-1001",
      status: "upcoming",
      roomTypeId: "superior-garden-view",
      roomTypeName: "Superior Garden View",
      imageUrl: "/images/room-bg-preview/Superior%20Garden%20View.jpg",
      guests: 2,
      nights: 1,
      bookingCreatedAt: hoursAgo(now, 2),
      checkInDate: bangkokDateOffset(now, 7),
      checkOutDate: bangkokDateOffset(now, 8),
      checkedInAt: null,
      cancelledAt: null,
      payment: { method: "credit_card", lastDigits: "888" },
      lineItems: [
        { label: "Superior Garden View", amount: 2500 },
        { label: "Airport transfer", amount: 200 },
        { label: "Promotion Code", amount: -200 },
      ],
      totalAmount: 2500,
      additionalRequest: null,
    },
    {
      id: "bh-2",
      bookingCode: "NLY-1002",
      status: "upcoming",
      roomTypeId: "deluxe",
      roomTypeName: "Deluxe",
      imageUrl: "/images/room-bg-preview/Deluxe.jpg",
      guests: 2,
      nights: 1,
      bookingCreatedAt: hoursAgo(now, 10),
      checkInDate: bangkokDateOffset(now, 6),
      checkOutDate: bangkokDateOffset(now, 7),
      checkedInAt: null,
      cancelledAt: null,
      payment: { method: "credit_card", lastDigits: "888" },
      lineItems: [
        { label: "Deluxe", amount: 2500 },
        { label: "Airport transfer", amount: 200 },
        { label: "Promotion Code", amount: -200 },
      ],
      totalAmount: 2500,
      additionalRequest: "Can I have some chocolate?",
    },
    {
      id: "bh-3",
      bookingCode: "NLY-1003",
      status: "upcoming",
      roomTypeId: "superior",
      roomTypeName: "Superior",
      imageUrl: "/images/room-bg-preview/Superior.jpg",
      guests: 2,
      nights: 2,
      bookingCreatedAt: hoursAgo(now, 72),
      checkInDate: bangkokDateOffset(now, 5),
      checkOutDate: bangkokDateOffset(now, 7),
      checkedInAt: null,
      cancelledAt: null,
      payment: { method: "credit_card", lastDigits: "441" },
      lineItems: [{ label: "Superior", amount: 4000 }],
      totalAmount: 4000,
      additionalRequest: null,
    },
    {
      id: "bh-4",
      bookingCode: "NLY-1004",
      status: "upcoming",
      roomTypeId: "premier-sea-view",
      roomTypeName: "Premier Sea View",
      imageUrl: "/images/room-bg-preview/Premier%20Sea%20View.jpg",
      guests: 2,
      nights: 1,
      bookingCreatedAt: hoursAgo(now, 240),
      checkInDate: bangkokDateOffset(now, 1),
      checkOutDate: bangkokDateOffset(now, 2),
      checkedInAt: null,
      cancelledAt: null,
      payment: { method: "credit_card", lastDigits: "512" },
      lineItems: [
        { label: "Premier Sea View", amount: 3600 },
        { label: "Extra bed", amount: 500 },
      ],
      totalAmount: 4100,
      additionalRequest: "Late check-out if possible.",
    },
    {
      id: "bh-5",
      bookingCode: "NLY-1005",
      status: "checked_in",
      roomTypeId: "supreme",
      roomTypeName: "Supreme",
      imageUrl: "/images/room-bg-preview/Supreme.jpg",
      guests: 3,
      nights: 2,
      bookingCreatedAt: hoursAgo(now, 120),
      checkInDate: bangkokDateOffset(now, 0),
      checkOutDate: bangkokDateOffset(now, 2),
      checkedInAt: hoursAgo(now, 1),
      cancelledAt: null,
      payment: { method: "credit_card", lastDigits: "203" },
      lineItems: [{ label: "Supreme", amount: 8200 }],
      totalAmount: 8200,
      additionalRequest: null,
    },
    {
      id: "bh-6",
      bookingCode: "NLY-1006",
      status: "cancelled",
      roomTypeId: "suite",
      roomTypeName: "Suite",
      imageUrl: "/images/room-bg-preview/Suite.jpg",
      guests: 2,
      nights: 1,
      bookingCreatedAt: hoursAgo(now, 96),
      checkInDate: bangkokDateOffset(now, 4),
      checkOutDate: bangkokDateOffset(now, 5),
      checkedInAt: null,
      cancelledAt: hoursAgo(now, 30),
      payment: { method: "credit_card", lastDigits: "888" },
      lineItems: [{ label: "Suite", amount: 5400 }],
      totalAmount: 5400,
      additionalRequest: null,
    },
  ];
}
