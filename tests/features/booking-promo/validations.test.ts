import { describe, expect, it } from "vitest";
import { parseValidatePromoBody } from "@/features/booking-promo/validations";

const ROOM_TYPE_ID = "11111111-1111-1111-1111-111111111111";

describe("parseValidatePromoBody", () => {
  it("accepts a valid promo validation request", () => {
    const result = parseValidatePromoBody({
      code: "neatly10",
      roomTypeId: ROOM_TYPE_ID,
      subtotal: 2100,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        code: "NEATLY10",
        roomTypeId: ROOM_TYPE_ID,
        subtotal: 2100,
      });
    }
  });

  it("rejects a missing room type id", () => {
    const result = parseValidatePromoBody({
      code: "NEATLY10",
      subtotal: 2100,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toBe("Validation failed");
      expect(result.fieldErrors.roomTypeId).toBeDefined();
    }
  });

  it("rejects a non-positive subtotal", () => {
    const result = parseValidatePromoBody({
      code: "NEATLY10",
      roomTypeId: ROOM_TYPE_ID,
      subtotal: 0,
    });

    expect(result.success).toBe(false);
  });

  it("rejects an empty promotion code", () => {
    const result = parseValidatePromoBody({
      code: "   ",
      roomTypeId: ROOM_TYPE_ID,
      subtotal: 2100,
    });

    expect(result.success).toBe(false);
  });
});
