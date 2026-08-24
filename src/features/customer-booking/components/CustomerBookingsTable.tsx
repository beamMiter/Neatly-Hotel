"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import type { BookingStatus } from "@/types/booking";
import type { CustomerBookingSummary } from "@/types/customer-booking";

function formatDate(value: string) {
  return format(new Date(value), "EEE, d MMM yyyy");
}

function formatStatus(status: BookingStatus) {
  return status.replaceAll("_", " ");
}

const COLUMNS = [
  "Customer name",
  "Guest(s)",
  "Room type",
  "Amount",
  "Bed Type",
  "Check-in",
  "Check-out",
  "Status",
];

export function CustomerBookingsTable({ bookings }: { bookings: CustomerBookingSummary[] }) {
  const router = useRouter();

  if (bookings.length === 0) {
    return <p className="px-8 py-12 text-center text-sm text-brand-muted">No bookings found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead>
          <tr className="bg-brand-surface-alt text-brand-muted">
            {COLUMNS.map((column) => (
              <th key={column} className="whitespace-nowrap px-6 py-3 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr
              key={booking.id}
              onClick={() => router.push(`/customer-booking/${booking.id}`)}
              className="cursor-pointer border-b border-brand-border transition-colors last:border-0 hover:bg-brand-surface-alt"
            >
              <td className="px-6 py-4 text-brand-body">{booking.customerName}</td>
              <td className="px-6 py-4 text-brand-body">{booking.guests}</td>
              <td className="px-6 py-4 text-brand-body">{booking.roomType}</td>
              <td className="px-6 py-4 text-brand-body">{booking.amount}</td>
              <td className="px-6 py-4 text-brand-body">{booking.bedType}</td>
              <td className="px-6 py-4 text-brand-body">{formatDate(booking.checkIn)}</td>
              <td className="px-6 py-4 text-brand-body">{formatDate(booking.checkOut)}</td>
              <td className="px-6 py-4 capitalize text-brand-body">{formatStatus(booking.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
