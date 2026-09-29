export type PromoDiscountType = "percent" | "fixed";

export type PromoValidationInput = {
  code: string;
  roomTypeId: string;
  /** Pre-promo total (room + add-ons), before this discount. */
  subtotal: number;
};

export type PromoValidationResult =
  | {
      valid: true;
      code: string;
      discountType: PromoDiscountType;
      discountValue: number;
      discountAmount: number;
      subtotal: number;
      totalAfterDiscount: number;
      message: null;
    }
  | {
      valid: false;
      code: string;
      discountAmount: 0;
      subtotal: number;
      totalAfterDiscount: number;
      message: string;
    };
