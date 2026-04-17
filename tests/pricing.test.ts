import test from "node:test";
import assert from "node:assert/strict";

import { calculatePriceBreakdown, UNIT_PRICE_PENCE, VAT_RATE } from "@/lib/pricing";

test("calculatePriceBreakdown uses the flat per-file rate", () => {
  const breakdown = calculatePriceBreakdown(3);

  assert.equal(breakdown.fileCount, 3);
  assert.equal(breakdown.unitPricePence, UNIT_PRICE_PENCE);
  assert.equal(breakdown.subtotalPence, 4200);
  assert.equal(breakdown.vatPence, Math.round(4200 * VAT_RATE));
  assert.equal(breakdown.totalPence, 5040);
});

test("calculatePriceBreakdown floors invalid fractional counts to a safe integer", () => {
  const breakdown = calculatePriceBreakdown(2.9);

  assert.equal(breakdown.fileCount, 2);
  assert.equal(breakdown.subtotalPence, 2800);
});
