/**
 * Safe Decimal Math Utilities for Financial and Weight Calculations
 * Avoids IEEE-754 floating point issues (e.g. 0.1 + 0.2 !== 0.3)
 */

export function roundTo(val: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

/**
 * Calculates subtotal: Weight (KG) * Price Per KG
 * Preserves 2 decimal currency precision
 */
export function calculateSubtotal(weightKg: number, pricePerKg: number): number {
  if (weightKg <= 0 || pricePerKg <= 0) return 0;
  // Convert price to cents to avoid floating point error
  const priceInCents = Math.round(pricePerKg * 100);
  const totalCents = Math.round(weightKg * priceInCents);
  return totalCents / 100;
}

/**
 * Calculates change given amount received and total
 */
export function calculateChange(amountReceived: number, total: number): number {
  const receivedCents = Math.round(amountReceived * 100);
  const totalCents = Math.round(total * 100);
  const changeCents = receivedCents - totalCents;
  return changeCents >= 0 ? changeCents / 100 : 0;
}

/**
 * Sums array of monetary amounts safely
 */
export function sumCurrency(amounts: number[]): number {
  const totalCents = amounts.reduce((acc, curr) => acc + Math.round(curr * 100), 0);
  return totalCents / 100;
}

/**
 * Sums array of weights in KG safely (up to 3 decimal places)
 */
export function sumWeight(weights: number[]): number {
  const totalGrams = weights.reduce((acc, curr) => acc + Math.round(curr * 1000), 0);
  return totalGrams / 1000;
}
