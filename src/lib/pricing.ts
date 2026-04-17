import type { PriceBreakdown } from "@/lib/domain";

export const UNIT_PRICE_PENCE = 1400;
export const VAT_RATE = 0.2;

export function calculatePriceBreakdown(fileCount: number): PriceBreakdown {
  const safeFileCount = Math.max(0, Math.floor(fileCount));
  const subtotalPence = safeFileCount * UNIT_PRICE_PENCE;
  const vatPence = Math.round(subtotalPence * VAT_RATE);

  return {
    fileCount: safeFileCount,
    unitPricePence: UNIT_PRICE_PENCE,
    subtotalPence,
    vatRate: VAT_RATE,
    vatPence,
    totalPence: subtotalPence + vatPence,
  };
}
