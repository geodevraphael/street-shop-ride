/**
 * Compute the share of the boda fee the client pays after seller subsidy.
 * - fee: total negotiated boda fee (what the rider receives)
 * - subsidyPct: 0-100, the seller's contribution percentage
 */
export function computeClientShare(fee: number, subsidyPct: number): number {
  const f = Math.max(0, Number(fee) || 0);
  const pct = Math.min(100, Math.max(0, Number(subsidyPct) || 0));
  // round to nearest 100 TZS for cash-friendly amounts
  const raw = (f * (100 - pct)) / 100;
  return Math.round(raw / 100) * 100;
}

export function computeSellerShare(fee: number, subsidyPct: number): number {
  return Math.max(0, (Number(fee) || 0) - computeClientShare(fee, subsidyPct));
}
