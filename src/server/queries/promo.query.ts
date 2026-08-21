import "server-only";
import { bangkokTodayIso } from "@/features/booking/date-rules";
import { prisma } from "@/server/db";
import type {
  PromoDiscountType,
  PromoValidationInput,
  PromoValidationResult,
} from "@/types/promo";

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function toIsoDateOnly(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

export function calculatePromoDiscount(input: {
  discountType: PromoDiscountType;
  discountValue: number;
  subtotal: number;
}): number {
  if (input.subtotal <= 0 || input.discountValue <= 0) return 0;

  const raw =
    input.discountType === "percent"
      ? (input.subtotal * input.discountValue) / 100
      : input.discountValue;

  return roundMoney(Math.min(Math.max(raw, 0), input.subtotal));
}

export async function validatePromotionCode(
  input: PromoValidationInput,
): Promise<PromoValidationResult> {
  const code = input.code.trim().toUpperCase();
  const subtotal = roundMoney(input.subtotal);

  const promo = await prisma.promotionCode.findUnique({
    where: { code },
  });

  if (!promo || !promo.isActive) {
    return {
      valid: false,
      code,
      discountAmount: 0,
      subtotal,
      totalAfterDiscount: subtotal,
      message: "This promotion code is invalid",
    };
  }

  const today = bangkokTodayIso();
  const validFrom = toIsoDateOnly(promo.validFrom);
  const validTo = toIsoDateOnly(promo.validTo);

  if (validFrom && today < validFrom) {
    return {
      valid: false,
      code,
      discountAmount: 0,
      subtotal,
      totalAfterDiscount: subtotal,
      message: "This promotion code is not active yet",
    };
  }

  if (validTo && today > validTo) {
    return {
      valid: false,
      code,
      discountAmount: 0,
      subtotal,
      totalAfterDiscount: subtotal,
      message: "This promotion code has expired",
    };
  }

  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    return {
      valid: false,
      code,
      discountAmount: 0,
      subtotal,
      totalAfterDiscount: subtotal,
      message: "This promotion code has reached its usage limit",
    };
  }

  const minSubtotal = promo.minSubtotal === null ? null : toNumber(promo.minSubtotal);
  if (minSubtotal !== null && subtotal < minSubtotal) {
    return {
      valid: false,
      code,
      discountAmount: 0,
      subtotal,
      totalAfterDiscount: subtotal,
      message: `This promotion requires a minimum subtotal of THB ${minSubtotal.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    };
  }

  const applicableIds = promo.applicableRoomTypeIds ?? [];
  if (applicableIds.length > 0 && !applicableIds.includes(input.roomTypeId)) {
    return {
      valid: false,
      code,
      discountAmount: 0,
      subtotal,
      totalAfterDiscount: subtotal,
      message: "This promo code isn't valid for this room. Try another code or room",
    };
  }

  const discountType = promo.discountType as PromoDiscountType;
  if (discountType !== "percent" && discountType !== "fixed") {
    return {
      valid: false,
      code,
      discountAmount: 0,
      subtotal,
      totalAfterDiscount: subtotal,
      message: "This promotion code is invalid",
    };
  }

  const discountValue = toNumber(promo.discountValue);
  const discountAmount = calculatePromoDiscount({
    discountType,
    discountValue,
    subtotal,
  });

  if (discountAmount <= 0) {
    return {
      valid: false,
      code,
      discountAmount: 0,
      subtotal,
      totalAfterDiscount: subtotal,
      message: "This promotion code cannot be applied to the current total",
    };
  }

  return {
    valid: true,
    code: promo.code,
    discountType,
    discountValue,
    discountAmount,
    subtotal,
    totalAfterDiscount: roundMoney(subtotal - discountAmount),
    message: null,
  };
}
