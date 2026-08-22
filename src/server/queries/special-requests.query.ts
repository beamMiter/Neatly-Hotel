import "server-only";
import { resolveAddOnQuantity, type AddOnBillingType } from "@/lib/addon-pricing";
import { supabaseAdmin } from "@/server/db/supabase-admin";
import type { SelectedSpecialRequest, SpecialRequestOption, SpecialRequestSelection } from "@/types/booking";

type SpecialRequestRow = {
  code: string;
  label: string;
  category: "standard" | "special";
  price: number | string;
  billing_type: AddOnBillingType;
};

export async function getSpecialRequestCatalog(): Promise<SpecialRequestOption[]> {
  const { data, error } = await supabaseAdmin
    .from("special_requests")
    .select("code, label, category, price, billing_type")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  // Throw rather than degrade to an empty catalog: computePricing resolves
  // add-ons against this list, so an empty one silently charges the guest
  // room-only for a booking that includes paid extras.
  if (error) {
    console.error("[special_requests] failed to fetch catalog:", error);
    throw new Error("Failed to load the special request catalog");
  }

  return ((data ?? []) as SpecialRequestRow[]).map((row) => ({
    code: row.code,
    label: row.label,
    category: row.category,
    price: Number(row.price),
    billingType: row.billing_type,
  }));
}

// Server-side authoritative resolve: never trust prices *or* quantities the
// client sends — only the codes (and, for per_leg/per_day_guest, the 1-2
// count) it selected. The actual multiplier always comes from
// resolveAddOnQuantity(billingType, count, nights), never from the client.
export function resolveSelectedSpecialRequests(
  catalog: SpecialRequestOption[],
  selections: SpecialRequestSelection[],
  nights: number,
): SelectedSpecialRequest[] {
  const byCode = new Map(catalog.map((option) => [option.code, option]));

  // Same code sent twice: keep the last one rather than accumulating —
  // unlike a free-form quantity, "legs" and "guests" are bounded selections
  // where summing duplicates wouldn't mean anything (there's no such thing
  // as 4 airport-transfer legs).
  const countByCode = new Map<string, number | undefined>();
  for (const selection of selections) {
    const option = byCode.get(selection.code);
    if (!option || option.category !== "special") continue;
    countByCode.set(selection.code, selection.count);
  }

  return [...countByCode.entries()].map(([code, count]) => {
    const option = byCode.get(code)!;
    return {
      code: option.code,
      label: option.label,
      price: option.price,
      quantity: resolveAddOnQuantity(option.billingType, count, nights),
    };
  });
}

export function validateStandardRequestCodes(catalog: SpecialRequestOption[], codes: string[]): boolean {
  const valid = new Set(catalog.filter((option) => option.category === "standard").map((option) => option.code));
  return codes.every((code) => valid.has(code));
}
