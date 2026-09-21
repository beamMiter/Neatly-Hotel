import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  roomTypeInsert: vi.fn(),
  roomTypeDelete: vi.fn(),
  imagesInsert: vi.fn(),
  imagesDelete: vi.fn(),
  imagesSelect: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/server/db/supabase-admin", () => ({
  supabaseAdmin: {
    from: (table: string) =>
      table === "room_types"
        ? {
            insert: () => ({ select: () => ({ single: () => mocks.roomTypeInsert() }) }),
            delete: () => ({ eq: (_c: string, id: string) => mocks.roomTypeDelete(id) }),
          }
        : {
            insert: (rows: unknown) => mocks.imagesInsert(rows),
            delete: () => ({ eq: (_c: string, id: string) => mocks.imagesDelete(id) }),
            select: () => ({ eq: () => mocks.imagesSelect() }),
          },
    storage: {
      from: () => ({ upload: mocks.upload, remove: mocks.remove }),
    },
  },
}));

import { createRoomType, deleteRoomType } from "@/server/queries/room-types.query";

const image = (name: string) => new File([new Uint8Array(10)], name, { type: "image/jpeg" });

const params = {
  data: {
    roomType: "Deluxe",
    roomSizeSqm: 30,
    bedType: "King Bed",
    guests: 2,
    price: 3000,
    description: "Nice room",
  },
  amenities: ["Wi-Fi"],
  mainImage: image("main.jpg"),
  gallery: [image("g1.jpg"), image("g2.jpg")],
} as Parameters<typeof createRoomType>[0];

describe("createRoomType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.roomTypeInsert.mockResolvedValue({ data: { id: "rt-1" }, error: null });
    mocks.roomTypeDelete.mockResolvedValue({ error: null });
    mocks.imagesDelete.mockResolvedValue({ error: null });
    mocks.imagesInsert.mockResolvedValue({ error: null });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.remove.mockResolvedValue({ error: null });
  });

  it("creates the room and all images on the happy path", async () => {
    await expect(createRoomType(params)).resolves.toEqual({ success: true, id: "rt-1" });
    expect(mocks.upload).toHaveBeenCalledTimes(3);
    expect(mocks.imagesInsert).toHaveBeenCalledOnce();
    expect(mocks.roomTypeDelete).not.toHaveBeenCalled();
  });

  it("reports a duplicate name without touching storage", async () => {
    mocks.roomTypeInsert.mockResolvedValue({
      data: null,
      error: { code: "23505", message: 'duplicate key value violates unique constraint "room_types_name_key"' },
    });
    await expect(createRoomType(params)).resolves.toMatchObject({ success: false, kind: "duplicate" });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("reports other insert failures as a plain failure", async () => {
    mocks.roomTypeInsert.mockResolvedValue({ data: null, error: { code: "XX000", message: "boom" } });
    const result = await createRoomType(params);
    expect(result).toMatchObject({ success: false, message: "Failed to save the room" });
    expect(result).not.toHaveProperty("kind");
  });

  it("rolls back the room row when the main image upload fails", async () => {
    mocks.upload.mockResolvedValueOnce({ error: { message: "storage down" } });
    await expect(createRoomType(params)).resolves.toMatchObject({
      success: false,
      kind: "image-upload",
      message: "Failed to upload the main image",
    });
    expect(mocks.roomTypeDelete).toHaveBeenCalledWith("rt-1");
    expect(mocks.imagesDelete).toHaveBeenCalledWith("rt-1");
  });

  it("rolls back the room and already-uploaded files when a gallery image fails", async () => {
    mocks.upload
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "storage down" } });
    await expect(createRoomType(params)).resolves.toMatchObject({
      success: false,
      kind: "image-upload",
      message: "Failed to upload gallery image 1",
    });
    expect(mocks.remove).toHaveBeenCalledWith(["rt-1/0.jpg"]);
    expect(mocks.roomTypeDelete).toHaveBeenCalledWith("rt-1");
  });

  it("rolls back when saving the image rows fails", async () => {
    mocks.imagesInsert.mockResolvedValue({ error: { message: "rls" } });
    await expect(createRoomType(params)).resolves.toMatchObject({ success: false, kind: "image-upload" });
    expect(mocks.remove).toHaveBeenCalledWith(["rt-1/0.jpg", "rt-1/1.jpg", "rt-1/2.jpg"]);
    expect(mocks.roomTypeDelete).toHaveBeenCalledWith("rt-1");
  });
});

describe("deleteRoomType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.imagesSelect.mockResolvedValue({ data: [{ storage_path: "rt-1/0.jpg" }] });
    mocks.remove.mockResolvedValue({ error: null });
  });

  it("deletes the room and its stored images", async () => {
    mocks.roomTypeDelete.mockResolvedValue({ error: null });
    await expect(deleteRoomType("rt-1")).resolves.toEqual({ success: true });
    expect(mocks.remove).toHaveBeenCalledWith(["rt-1/0.jpg"]);
  });

  it("reports a foreign-key violation as in-use and keeps the images", async () => {
    mocks.roomTypeDelete.mockResolvedValue({ error: { code: "23503", message: "fk" } });
    await expect(deleteRoomType("rt-1")).resolves.toMatchObject({ success: false, kind: "in-use" });
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("reports other delete failures as a plain failure", async () => {
    mocks.roomTypeDelete.mockResolvedValue({ error: { code: "XX000", message: "boom" } });
    const result = await deleteRoomType("rt-1");
    expect(result).toMatchObject({ success: false, message: "Failed to delete the room" });
    expect(result).not.toHaveProperty("kind");
  });
});
