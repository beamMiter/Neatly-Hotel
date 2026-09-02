import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validatePromotionCode: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  hasDatabaseUrl: () => true,
}));

vi.mock("@/server/queries/promo.query", () => ({
  validatePromotionCode: mocks.validatePromotionCode,
}));

import { POST } from "@/app/api/booking/promo/validate/route";

const ROOM_TYPE_ID = "11111111-1111-1111-1111-111111111111";

function promoRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/booking/promo/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/booking/promo/validate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a valid promotion preview for an accepted code", async () => {
    mocks.validatePromotionCode.mockResolvedValue({
      valid: true,
      code: "NEATLY10",
      discountType: "percent",
      discountValue: 10,
      discountAmount: 210,
      subtotal: 2100,
      totalAfterDiscount: 1890,
      message: null,
    });

    const response = await POST(
      promoRequest({ code: "NEATLY10", roomTypeId: ROOM_TYPE_ID, subtotal: 2100 }),
    );

    expect(mocks.validatePromotionCode).toHaveBeenCalledWith({
      code: "NEATLY10",
      roomTypeId: ROOM_TYPE_ID,
      subtotal: 2100,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      source: "database",
      data: {
        valid: true,
        code: "NEATLY10",
        discountType: "percent",
        discountValue: 10,
        discountAmount: 210,
        subtotal: 2100,
        totalAfterDiscount: 1890,
        message: null,
      },
    });
  });

  it("returns validation errors for an invalid request body", async () => {
    const response = await POST(promoRequest({ code: "NEATLY10", subtotal: 2100 }));

    expect(mocks.validatePromotionCode).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Validation failed",
    });
  });

  it("returns the promotion error message for a rejected code", async () => {
    mocks.validatePromotionCode.mockResolvedValue({
      valid: false,
      code: "INVALID99",
      discountAmount: 0,
      subtotal: 2100,
      totalAfterDiscount: 2100,
      message: "This promotion code is invalid",
    });

    const response = await POST(
      promoRequest({ code: "INVALID99", roomTypeId: ROOM_TYPE_ID, subtotal: 2100 }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      source: "database",
      data: {
        valid: false,
        code: "INVALID99",
        discountAmount: 0,
        subtotal: 2100,
        totalAfterDiscount: 2100,
        message: "This promotion code is invalid",
      },
    });
  });
});
