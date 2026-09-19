import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  requireStaff: vi.fn(),
  createRoomType: vi.fn(),
  updateRoomType: vi.fn(),
  deleteRoomType: vi.fn(),
}));

vi.mock("@/server/db/supabase-server", () => ({ createClient: vi.fn() }));
vi.mock("@/server/db/supabase-admin", () => ({ supabaseAdmin: {} }));

vi.mock("@/server/services/authorization", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/services/authorization")>();
  return { ...actual, requireStaff: mocks.requireStaff };
});

vi.mock("@/server/queries/room-types.query", () => ({
  createRoomType: mocks.createRoomType,
  updateRoomType: mocks.updateRoomType,
  deleteRoomType: mocks.deleteRoomType,
}));

import { AuthorizationError } from "@/server/services/authorization";
import { POST } from "@/app/api/room-types/route";
import { DELETE, PATCH } from "@/app/api/room-types/[id]/route";

function image(name: string) {
  return new File([new Uint8Array(10)], name, { type: "image/jpeg" });
}

function validCreateForm() {
  const form = new FormData();
  form.append("roomType", "Deluxe");
  form.append("roomSizeSqm", "30");
  form.append("bedType", "King Bed");
  form.append("guests", "2");
  form.append("price", "3000");
  form.append("description", "Nice room");
  form.append("amenities", "Wi-Fi");
  form.append("mainImage", image("main.jpg"));
  for (let i = 0; i < 4; i++) form.append("gallery", image(`g${i}.jpg`));
  return form;
}

const post = (form: FormData) =>
  POST(new Request("http://localhost/api/room-types", { method: "POST", body: form }));

const context = { params: Promise.resolve({ id: "room-1" }) };

describe("POST /api/room-types", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireStaff.mockResolvedValue({ userId: "staff-1" });
  });

  it("returns 401 when not signed in", async () => {
    mocks.requireStaff.mockRejectedValue(new AuthorizationError(401, "Unauthorized"));
    const response = await post(validCreateForm());
    expect(response.status).toBe(401);
    expect(mocks.createRoomType).not.toHaveBeenCalled();
  });

  it("returns 403 when signed in but not staff", async () => {
    mocks.requireStaff.mockRejectedValue(new AuthorizationError(403, "Forbidden"));
    const response = await post(validCreateForm());
    expect(response.status).toBe(403);
  });

  it("returns 400 with fieldErrors for invalid data", async () => {
    const form = validCreateForm();
    form.set("roomType", "");
    const response = await post(form);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.fieldErrors.roomType).toBeTruthy();
    expect(mocks.createRoomType).not.toHaveBeenCalled();
  });

  it("returns 201 with the new id on success", async () => {
    mocks.createRoomType.mockResolvedValue({ success: true, id: "new-id" });
    const response = await post(validCreateForm());
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ id: "new-id" });
  });

  it("returns 409 with a roomType field error for a duplicate name", async () => {
    mocks.createRoomType.mockResolvedValue({
      success: false,
      kind: "duplicate",
      message: "A room type with this name already exists",
    });
    const response = await post(validCreateForm());
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      kind: "duplicate",
      fieldErrors: { roomType: "A room type with this name already exists" },
    });
  });

  it("returns 502 when an image upload fails", async () => {
    mocks.createRoomType.mockResolvedValue({
      success: false,
      kind: "image-upload",
      message: "Failed to upload the main image",
    });
    const response = await post(validCreateForm());
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ kind: "image-upload" });
  });

  it("returns 500 for an unclassified failure", async () => {
    mocks.createRoomType.mockResolvedValue({ success: false, message: "Failed to save the room" });
    const response = await post(validCreateForm());
    expect(response.status).toBe(500);
  });
});

describe("PATCH/DELETE /api/room-types/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireStaff.mockResolvedValue({ userId: "staff-1" });
  });

  const deleteRequest = () =>
    DELETE(new Request("http://localhost/api/room-types/room-1", { method: "DELETE" }), context);

  it("DELETE returns 409 when the room type is still referenced", async () => {
    mocks.deleteRoomType.mockResolvedValue({
      success: false,
      kind: "in-use",
      message: "This room type is still used by rooms or bookings, so it cannot be deleted",
    });
    const response = await deleteRequest();
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ kind: "in-use" });
  });

  it("DELETE returns 200 on success", async () => {
    mocks.deleteRoomType.mockResolvedValue({ success: true });
    const response = await deleteRequest();
    expect(response.status).toBe(200);
  });

  it("PATCH returns 409 when renaming to an existing name", async () => {
    mocks.updateRoomType.mockResolvedValue({
      success: false,
      kind: "duplicate",
      message: "A room type with this name already exists",
    });
    const form = validCreateForm();
    form.delete("mainImage");
    form.delete("gallery");
    form.append("mainImageId", "img-1");
    const order = [2, 3, 4, 5].map((n) => `existing:img-${n}`);
    form.append("galleryOrder", JSON.stringify(order));
    const response = await PATCH(
      new Request("http://localhost/api/room-types/room-1", { method: "PATCH", body: form }),
      context,
    );
    expect(response.status).toBe(409);
  });
});
