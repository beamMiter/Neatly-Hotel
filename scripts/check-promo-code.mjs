/**
 * Offline checks for promotion code validation rules.
 * Source of truth: src/server/queries/promo.query.ts
 *                  src/features/booking-promo/validations.ts
 * Seed codes: supabase/migrations/0006_promotion_codes.sql
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ROOM_TYPE_A = "11111111-1111-1111-1111-111111111111";
const ROOM_TYPE_B = "22222222-2222-2222-2222-222222222222";

function roundMoney(amount) {
  return Math.round(amount * 100) / 100;
}

function bangkokTodayIso() {
  const now = new Date();
  const bangkokNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const year = bangkokNow.getFullYear();
  const month = String(bangkokNow.getMonth() + 1).padStart(2, "0");
  const day = String(bangkokNow.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calculatePromoDiscount({ discountType, discountValue, subtotal }) {
  if (subtotal <= 0 || discountValue <= 0) return 0;

  const raw =
    discountType === "percent" ? (subtotal * discountValue) / 100 : discountValue;

  return roundMoney(Math.min(Math.max(raw, 0), subtotal));
}

/** Mirrors validatePromotionCode — promos keyed by uppercase code. */
function validatePromotionCode(input, promos, today) {
  const code = input.code.trim().toUpperCase();
  const subtotal = roundMoney(input.subtotal);
  const promo = promos[code];

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

  const validFrom = promo.validFrom ?? null;
  const validTo = promo.validTo ?? null;

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

  const minSubtotal = promo.minSubtotal ?? null;
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

  const discountType = promo.discountType;
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

  const discountAmount = calculatePromoDiscount({
    discountType,
    discountValue: promo.discountValue,
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
    discountValue: promo.discountValue,
    discountAmount,
    subtotal,
    totalAfterDiscount: roundMoney(subtotal - discountAmount),
    message: null,
  };
}

function parseValidatePromoBody(body) {
  if (!body || typeof body !== "object") {
    return { success: false, message: "Validation failed" };
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  const roomTypeId = typeof body.roomTypeId === "string" ? body.roomTypeId.trim() : "";
  const subtotal = Number(body.subtotal);

  if (!code || code.length > 40) return { success: false, message: "Validation failed" };
  if (!UUID_PATTERN.test(roomTypeId)) return { success: false, message: "Validation failed" };
  if (!Number.isFinite(subtotal) || subtotal <= 0) return { success: false, message: "Validation failed" };

  return {
    success: true,
    data: { code: code.toUpperCase(), roomTypeId, subtotal },
  };
}

/** Seed-aligned fixtures from 0006_promotion_codes.sql */
const SEED_PROMOS = {
  NEATLY10: {
    code: "NEATLY10",
    discountType: "percent",
    discountValue: 10,
    minSubtotal: null,
    validFrom: null,
    validTo: null,
    isActive: true,
    applicableRoomTypeIds: [],
  },
  SAVE400: {
    code: "SAVE400",
    discountType: "fixed",
    discountValue: 400,
    minSubtotal: 1500,
    validFrom: null,
    validTo: null,
    isActive: true,
    applicableRoomTypeIds: [],
  },
  EXPIRED: {
    code: "EXPIRED",
    discountType: "percent",
    discountValue: 20,
    minSubtotal: null,
    validFrom: "2020-01-01",
    validTo: "2020-12-31",
    isActive: true,
    applicableRoomTypeIds: [],
  },
};

const TODAY = bangkokTodayIso();

function assertEqual(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
  console.log(`PASS ${label}`);
}

function assertDeepEqual(label, actual, expected) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${label}: expected ${expectedJson}, got ${actualJson}`);
  }
  console.log(`PASS ${label}`);
}

// calculatePromoDiscount
assertEqual("percent discount 10% of 2100", calculatePromoDiscount({ discountType: "percent", discountValue: 10, subtotal: 2100 }), 210);
assertEqual("fixed discount 400", calculatePromoDiscount({ discountType: "fixed", discountValue: 400, subtotal: 2100 }), 400);
assertEqual("discount capped at subtotal", calculatePromoDiscount({ discountType: "fixed", discountValue: 500, subtotal: 300 }), 300);
assertEqual("zero subtotal gives zero discount", calculatePromoDiscount({ discountType: "percent", discountValue: 10, subtotal: 0 }), 0);

// Happy path — seed codes
assertDeepEqual(
  "NEATLY10 applies 10% on 2100",
  validatePromotionCode({ code: "neatly10", roomTypeId: ROOM_TYPE_A, subtotal: 2100 }, SEED_PROMOS, TODAY),
  {
    valid: true,
    code: "NEATLY10",
    discountType: "percent",
    discountValue: 10,
    discountAmount: 210,
    subtotal: 2100,
    totalAfterDiscount: 1890,
    message: null,
  },
);

assertDeepEqual(
  "SAVE400 applies fixed 400 when subtotal meets minimum",
  validatePromotionCode({ code: "SAVE400", roomTypeId: ROOM_TYPE_A, subtotal: 2100 }, SEED_PROMOS, TODAY),
  {
    valid: true,
    code: "SAVE400",
    discountType: "fixed",
    discountValue: 400,
    discountAmount: 400,
    subtotal: 2100,
    totalAfterDiscount: 1700,
    message: null,
  },
);

assertDeepEqual(
  "SAVE400 applies at exact minimum subtotal",
  validatePromotionCode({ code: "SAVE400", roomTypeId: ROOM_TYPE_A, subtotal: 1500 }, SEED_PROMOS, TODAY),
  {
    valid: true,
    code: "SAVE400",
    discountType: "fixed",
    discountValue: 400,
    discountAmount: 400,
    subtotal: 1500,
    totalAfterDiscount: 1100,
    message: null,
  },
);

// Error cases
assertEqual(
  "unknown code is invalid",
  validatePromotionCode({ code: "INVALID99", roomTypeId: ROOM_TYPE_A, subtotal: 2100 }, SEED_PROMOS, TODAY).message,
  "This promotion code is invalid",
);

assertEqual(
  "EXPIRED seed code is rejected",
  validatePromotionCode({ code: "EXPIRED", roomTypeId: ROOM_TYPE_A, subtotal: 2100 }, SEED_PROMOS, TODAY).message,
  "This promotion code has expired",
);

assertEqual(
  "SAVE400 below minimum subtotal",
  validatePromotionCode({ code: "SAVE400", roomTypeId: ROOM_TYPE_A, subtotal: 1400 }, SEED_PROMOS, TODAY).message,
  "This promotion requires a minimum subtotal of THB 1,500.00",
);

assertEqual(
  "inactive code is invalid",
  validatePromotionCode(
    { code: "NEATLY10", roomTypeId: ROOM_TYPE_A, subtotal: 2100 },
    { NEATLY10: { ...SEED_PROMOS.NEATLY10, isActive: false } },
    TODAY,
  ).message,
  "This promotion code is invalid",
);

assertEqual(
  "room-restricted code rejects wrong room type",
  validatePromotionCode(
    { code: "ROOMONLY", roomTypeId: ROOM_TYPE_B, subtotal: 2100 },
    {
      ROOMONLY: {
        code: "ROOMONLY",
        discountType: "percent",
        discountValue: 10,
        minSubtotal: null,
        validFrom: null,
        validTo: null,
        isActive: true,
        applicableRoomTypeIds: [ROOM_TYPE_A],
      },
    },
    TODAY,
  ).message,
  "This promo code isn't valid for this room. Try another code or room",
);

assertEqual(
  "not-yet-active code is rejected",
  validatePromotionCode(
    { code: "FUTURE", roomTypeId: ROOM_TYPE_A, subtotal: 2100 },
    {
      FUTURE: {
        code: "FUTURE",
        discountType: "percent",
        discountValue: 10,
        minSubtotal: null,
        validFrom: "2099-01-01",
        validTo: null,
        isActive: true,
        applicableRoomTypeIds: [],
      },
    },
    TODAY,
  ).message,
  "This promotion code is not active yet",
);

// API body validation (mirrors parseValidatePromoBody)
assertEqual("valid promo request body", parseValidatePromoBody({ code: "NEATLY10", roomTypeId: ROOM_TYPE_A, subtotal: 2100 }).success, true);
assertEqual("missing roomTypeId fails validation", parseValidatePromoBody({ code: "NEATLY10", subtotal: 2100 }).success, false);
assertEqual("non-positive subtotal fails validation", parseValidatePromoBody({ code: "NEATLY10", roomTypeId: ROOM_TYPE_A, subtotal: 0 }).success, false);
assertEqual("empty code fails validation", parseValidatePromoBody({ code: "  ", roomTypeId: ROOM_TYPE_A, subtotal: 2100 }).success, false);

console.log("\nAll promotion code rule checks passed.");
