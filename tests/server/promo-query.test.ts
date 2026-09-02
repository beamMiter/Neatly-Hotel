import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  prisma: {
    promotionCode: {
      findUnique: mocks.findUnique,
    },
  },
}));

import { calculatePromoDiscount, validatePromotionCode } from "@/server/queries/promo.query";

const ROOM_TYPE_A = "11111111-1111-1111-1111-111111111111";
const ROOM_TYPE_B = "22222222-2222-2222-2222-222222222222";

describe("calculatePromoDiscount", () => {
  it("applies a percent discount", () => {
    expect(
      calculatePromoDiscount({ discountType: "percent", discountValue: 10, subtotal: 2100 }),
    ).toBe(210);
  });

  it("applies a fixed discount", () => {
    expect(
      calculatePromoDiscount({ discountType: "fixed", discountValue: 400, subtotal: 2100 }),
    ).toBe(400);
  });

  it("caps the discount at the subtotal", () => {
    expect(
      calculatePromoDiscount({ discountType: "fixed", discountValue: 500, subtotal: 300 }),
    ).toBe(300);
  });

  it("returns zero for a zero subtotal", () => {
    expect(
      calculatePromoDiscount({ discountType: "percent", discountValue: 10, subtotal: 0 }),
    ).toBe(0);
  });
});

describe("validatePromotionCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts NEATLY10 for a valid booking subtotal", async () => {
    mocks.findUnique.mockResolvedValue({
      code: "NEATLY10",
      discountType: "percent",
      discountValue: 10,
      minSubtotal: null,
      validFrom: null,
      validTo: null,
      isActive: true,
      applicableRoomTypeIds: [],
    });

    const result = await validatePromotionCode({
      code: "neatly10",
      roomTypeId: ROOM_TYPE_A,
      subtotal: 2100,
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.code).toBe("NEATLY10");
      expect(result.discountAmount).toBe(210);
      expect(result.totalAfterDiscount).toBe(1890);
    }
  });

  it("accepts SAVE400 when the subtotal meets the minimum", async () => {
    mocks.findUnique.mockResolvedValue({
      code: "SAVE400",
      discountType: "fixed",
      discountValue: 400,
      minSubtotal: 1500,
      validFrom: null,
      validTo: null,
      isActive: true,
      applicableRoomTypeIds: [],
    });

    const result = await validatePromotionCode({
      code: "SAVE400",
      roomTypeId: ROOM_TYPE_A,
      subtotal: 2100,
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.discountAmount).toBe(400);
      expect(result.totalAfterDiscount).toBe(1700);
    }
  });

  it("rejects an unknown promotion code", async () => {
    mocks.findUnique.mockResolvedValue(null);

    const result = await validatePromotionCode({
      code: "INVALID99",
      roomTypeId: ROOM_TYPE_A,
      subtotal: 2100,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toBe("This promotion code is invalid");
    }
  });

  it("rejects an expired promotion code", async () => {
    mocks.findUnique.mockResolvedValue({
      code: "EXPIRED",
      discountType: "percent",
      discountValue: 20,
      minSubtotal: null,
      validFrom: new Date("2020-01-01T00:00:00.000Z"),
      validTo: new Date("2020-12-31T00:00:00.000Z"),
      isActive: true,
      applicableRoomTypeIds: [],
    });

    const result = await validatePromotionCode({
      code: "EXPIRED",
      roomTypeId: ROOM_TYPE_A,
      subtotal: 2100,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toBe("This promotion code has expired");
    }
  });

  it("rejects SAVE400 when the subtotal is below the minimum", async () => {
    mocks.findUnique.mockResolvedValue({
      code: "SAVE400",
      discountType: "fixed",
      discountValue: 400,
      minSubtotal: 1500,
      validFrom: null,
      validTo: null,
      isActive: true,
      applicableRoomTypeIds: [],
    });

    const result = await validatePromotionCode({
      code: "SAVE400",
      roomTypeId: ROOM_TYPE_A,
      subtotal: 1400,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toBe("This promotion requires a minimum subtotal of THB 1,500.00");
    }
  });

  it("rejects a room-restricted code for the wrong room type", async () => {
    mocks.findUnique.mockResolvedValue({
      code: "ROOMONLY",
      discountType: "percent",
      discountValue: 10,
      minSubtotal: null,
      validFrom: null,
      validTo: null,
      isActive: true,
      applicableRoomTypeIds: [ROOM_TYPE_A],
    });

    const result = await validatePromotionCode({
      code: "ROOMONLY",
      roomTypeId: ROOM_TYPE_B,
      subtotal: 2100,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toBe("This promo code isn't valid for this room. Try another code or room");
    }
  });
});
