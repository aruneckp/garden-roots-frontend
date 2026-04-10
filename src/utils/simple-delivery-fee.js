/**
 * Delivery fee utilities.
 *
 * Fee calculation is performed by the backend (Google Distance Matrix API).
 * These helpers are used for address parsing and display formatting only.
 */

/** Extract the first 6-digit number from a Singapore address string. */
export function extractPostalCode(address) {
  if (!address) return null;
  const match = address.match(/\b(\d{6})\b/);
  return match ? match[1] : null;
}

/** Format a numeric fee for display. */
export function formatDeliveryFee(fee) {
  if (!fee || fee === 0) return 'Free';
  return `$${Number(fee).toFixed(2)}`;
}
