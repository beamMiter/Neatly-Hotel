import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RoomFormErrorDialog } from "@/features/rooms/components/RoomFormErrorDialog";
import { describeRoomFormFailure } from "@/lib/rooms/form-failure";

describe("RoomFormErrorDialog", () => {
  it("renders nothing when there is no failure", () => {
    expect(renderToStaticMarkup(<RoomFormErrorDialog failure={null} onClose={() => {}} />)).toBe("");
  });

  it("shows the title, reason and hint of a failure as an alert dialog", () => {
    const failure = describeRoomFormFailure(
      "create",
      { status: 409 },
      { kind: "duplicate", message: "A room type with this name already exists" },
    );
    const html = renderToStaticMarkup(<RoomFormErrorDialog failure={failure} onClose={() => {}} />);

    expect(html).toContain('role="alertdialog"');
    expect(html).toContain("Room name already in use");
    expect(html).toContain("A room type with this name already exists");
    expect(html).toContain("Choose a different Room Type name");
  });
});
