import { describe, expect, it } from "vitest";
import {
  describeRoomFormFailure,
  IMAGES_TOO_LARGE_FAILURE,
} from "@/lib/rooms/form-failure";

describe("describeRoomFormFailure", () => {
  it("explains a network failure when there is no response", () => {
    const failure = describeRoomFormFailure("create", null, null);
    expect(failure.title).toBe("Can't reach the server");
    expect(failure.reason).toContain("not saved");
    expect(failure.hint).toContain("still in the form");
  });

  it("says 'deleted' rather than 'saved' for a failed delete", () => {
    const failure = describeRoomFormFailure("delete", null, null);
    expect(failure.reason).toContain("not deleted");
  });

  it("explains an expired session (401)", () => {
    const failure = describeRoomFormFailure("update", { status: 401 }, null);
    expect(failure.title).toBe("Your session has expired");
    expect(failure.reason).toContain("save your changes");
  });

  it("explains missing permission (403)", () => {
    const failure = describeRoomFormFailure("create", { status: 403 }, null);
    expect(failure.title).toBe("You don't have permission");
  });

  it("points at highlighted fields for validation errors (400)", () => {
    const failure = describeRoomFormFailure("create", { status: 400 }, null);
    expect(failure.hint).toContain("highlighted");
  });

  it("explains a duplicate room name (409) using the server message", () => {
    const failure = describeRoomFormFailure(
      "create",
      { status: 409 },
      { message: "A room type with this name already exists", kind: "duplicate" },
    );
    expect(failure.title).toBe("Room name already in use");
    expect(failure.reason).toBe("A room type with this name already exists");
    expect(failure.hint).toContain("different");
  });

  it("explains a room type that is still in use (409, in-use)", () => {
    const failure = describeRoomFormFailure(
      "delete",
      { status: 409 },
      { message: "still used", kind: "in-use" },
    );
    expect(failure.title).toBe("This room type is still in use");
    expect(failure.reason).toBe("still used");
  });

  it("explains oversized images (413)", () => {
    expect(describeRoomFormFailure("create", { status: 413 }, null)).toBe(
      IMAGES_TOO_LARGE_FAILURE,
    );
  });

  it("tells create users nothing was saved after an image upload failure (502)", () => {
    const failure = describeRoomFormFailure(
      "create",
      { status: 502 },
      { message: "Failed to upload the main image" },
    );
    expect(failure.title).toBe("Image upload failed");
    expect(failure.reason).toBe("Failed to upload the main image");
    expect(failure.hint).toContain("Nothing was saved");
  });

  it("warns update users that other changes may already be saved (502)", () => {
    const failure = describeRoomFormFailure("update", { status: 502 }, null);
    expect(failure.hint).toContain("may already be saved");
  });

  it("falls back to a generic server error for 500 and unknown statuses", () => {
    const failure = describeRoomFormFailure("create", { status: 500 }, null);
    expect(failure.title).toBe("Something went wrong on our side");
    expect(failure.reason).toContain("create the room");
    expect(describeRoomFormFailure("create", { status: 418 }, null).title).toBe(
      failure.title,
    );
  });
});
