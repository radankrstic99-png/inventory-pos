// Money is stored as integer cents to avoid floating-point rounding errors.
export const toCents = (amount) => Math.round(Number(amount) * 100);
export const fromCents = (cents) => Math.round(cents) / 100;

/** VAT contained in a gross (VAT-inclusive) amount, e.g. 17% in Bosnia and Herzegovina. */
export const vatFromGross = (grossCents, ratePercent) =>
  Math.round((grossCents * ratePercent) / (100 + ratePercent));
