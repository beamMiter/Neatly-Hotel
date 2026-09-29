import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteRoom: vi.fn(),
  requireStaff: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  hasDatabaseUrl: () => true,
}));

vi.mock("@/server/queries/rooms.query", () => ({
  deleteRoom: mocks.deleteRoom,
  updateRoomStatus: vi.fn(),
}));

vi.mock("@/server/services/authorization", () => ({
  requireStaff: mocks.requireStaff,
  authorizationErrorResponse: vi.fn(),
}));

import { DELETE } from "@/app/api/rooms/[id]/route";

const agentRequest = new Request("http://localhost/api/rooms/test-room-id", {
  method: "DELETE",
});

describe("DELETE /api/rooms/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireStaff.mockResolvedValue({ userId: "agent-1" });
  });

  it("deletes an existing room for an authorized agent", async () => {
    mocks.deleteRoom.mockResolvedValue(true);

    const response = await DELETE(agentRequest, {
      params: Promise.resolve({ id: "test-room-id" }),
    });

    expect(mocks.requireStaff).toHaveBeenCalledOnce();
    expect(mocks.deleteRoom).toHaveBeenCalledWith("test-room-id");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      source: "database",
      data: { id: "test-room-id" },
    });
  });

  it("returns 404 when the requested room does not exist", async () => {
    mocks.deleteRoom.mockResolvedValue(false);

    const response = await DELETE(agentRequest, {
      params: Promise.resolve({ id: "missing-room-id" }),
    });

    expect(mocks.requireStaff).toHaveBeenCalledOnce();
    expect(mocks.deleteRoom).toHaveBeenCalledWith("missing-room-id");
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Room not found" });
  });
});
