import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  prisma: {
    room: {
      findMany: mocks.findMany,
      count: mocks.count,
      upsert: mocks.upsert,
    },
  },
}));

import { getRooms } from "@/server/queries/rooms.query";

describe("room list reads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([
      {
        id: "room-101",
        roomNo: "101",
        roomType: "Deluxe",
        bedType: "King Bed",
        status: "Vacant",
      },
    ]);
  });

  it("does not recreate seeded rooms while reading the room list", async () => {
    await expect(getRooms()).resolves.toHaveLength(1);
    expect(mocks.findMany).toHaveBeenCalledOnce();
    expect(mocks.count).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
