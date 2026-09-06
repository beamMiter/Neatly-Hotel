import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupportConversation } from "@/types/live-support";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/server/db/supabase-admin", () => ({
  supabaseAdmin: { from: mocks.from },
}));

import {
  getLinkedSupportBooking,
  listSupportBookings,
} from "@/server/queries/live-support.query";

function conversation(
  overrides: Partial<SupportConversation> = {},
): SupportConversation {
  return {
    id: "conversation-1",
    visitor_token: "visitor-1",
    customer_name: "Nina Member",
    customer_phone: null,
    customer_id: "member-1",
    booking_id: null,
    status: "active",
    topic: "Booking",
    assigned_agent_id: "agent-1",
    last_message_at: "2026-09-06T09:00:00.000Z",
    created_at: "2026-09-06T08:00:00.000Z",
    updated_at: "2026-09-06T09:00:00.000Z",
    resolved_at: null,
    summary: null,
    summary_generated_at: null,
    ...overrides,
  };
}

function bookingRow(id: string, code: string) {
  return {
    id,
    booking_code: code,
    customer_id: "member-1",
    guest_email: null,
    check_in: "2026-10-10",
    check_out: "2026-10-12",
    status: "confirmed",
    total_amount: 4200,
    addons_total: 0,
    special_requests: null,
    booking_rooms: [{ rooms: { room_type: "Deluxe" } }],
  };
}

function mockBookingQuery(rows: ReturnType<typeof bookingRow>[]) {
  const chain = {
    select: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    eq: vi.fn(),
    then: (resolve: (result: { data: typeof rows; error: null }) => unknown) =>
      Promise.resolve(resolve({ data: rows, error: null })),
  };
  chain.select.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  mocks.from.mockReturnValue(chain);
  return chain;
}

describe("live-support booking selection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps member booking history available to admin callers", async () => {
    const history = [
      bookingRow("old-2", "NB-OLD-2"),
      bookingRow("old-1", "NB-OLD-1"),
    ];
    const chain = mockBookingQuery(history);

    const result = await listSupportBookings(conversation());

    expect(result.map((booking) => booking.id)).toEqual(["old-2", "old-1"]);
    expect(chain.eq).toHaveBeenCalledWith("customer_id", "member-1");
  });

  it("does not treat member history as the current proposal booking", async () => {
    const result = await getLinkedSupportBooking(conversation());

    expect(result).toBeNull();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("returns only the booking explicitly linked to the proposal", async () => {
    const chain = mockBookingQuery([
      bookingRow("proposal-booking", "NB-CURRENT"),
    ]);

    const result = await getLinkedSupportBooking(
      conversation({ booking_id: "proposal-booking" }),
    );

    expect(result?.id).toBe("proposal-booking");
    expect(chain.eq).toHaveBeenCalledWith("id", "proposal-booking");
  });
});
