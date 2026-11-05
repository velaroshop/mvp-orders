// An upsell offer: `price` is the price of ONE piece, `quantity` how many pieces the offer contains, `srp` the list price of the
// WHOLE offer (typed in by hand, never multiplied). The server already charges price x quantity everywhere; these helpers make
// the forms and thank-you pages show and add up the same amounts.

/** What the customer pays for the whole offer */
export function offerTotal(price: number, quantity: number): number {
  return (Number(price) || 0) * Math.max(1, Number(quantity) || 1);
}

/** Reduction shown on the badge: list price of the offer against the price of the offer (0 when there is no reduction) */
export function offerDiscountPercent(srp: number, price: number, quantity: number): number {
  const total = offerTotal(price, quantity);
  return srp > 0 && srp > total ? Math.round(((srp - total) / srp) * 100) : 0;
}

/** "2 buc. x 12.45 Lei", only for offers with more than one piece */
export function offerUnitNote(price: number, quantity: number): string | null {
  const pieces = Math.max(1, Number(quantity) || 1);
  return pieces > 1 ? `${pieces} buc. × ${(Number(price) || 0).toFixed(2)} Lei` : null;
}

/** "12.45 Lei / buc.", only for offers with more than one piece (the pieces themselves are shown as "3×" before the name) */
export function offerPerPieceNote(price: number, quantity: number): string | null {
  return Math.max(1, Number(quantity) || 1) > 1 ? `${(Number(price) || 0).toFixed(2)} Lei / buc.` : null;
}

/** A free offer (price 0): the presale card shows "GRATIS" instead of a price */
export function isFreeOffer(price: number): boolean {
  return Number(price) === 0;
}
