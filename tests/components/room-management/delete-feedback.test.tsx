// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Room } from "@/types/rooms";

const mocks = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("@/server/db/supabase-browser", () => {
  const channel = {
    on: () => channel,
    subscribe: () => channel,
  };

  return {
    createClient: () => ({
      channel: () => channel,
      removeChannel: vi.fn(),
    }),
  };
});

import { RoomManagementView } from "@/features/room-management/components/room-management-view";

const rooms: Room[] = [
  {
    id: "room-101",
    roomNo: "101",
    roomType: "Deluxe",
    bedType: "King Bed",
    status: "Vacant",
  },
];

async function confirmDelete() {
  fireEvent.click(screen.getByRole("button", { name: "Delete room 101" }));
  fireEvent.click(screen.getByRole("button", { name: /^Delete$/ }));
}

describe("RoomManagementView delete feedback", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows a success toast after deleting a room", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
    );

    render(<RoomManagementView rooms={rooms} />);
    await confirmDelete();

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Room 101 deleted successfully.");
    });
  });

  it("shows an error toast when deleting a room fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    );

    render(<RoomManagementView rooms={rooms} />);
    await confirmDelete();

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Unable to delete the room. Please try again.");
    });
  });
});
