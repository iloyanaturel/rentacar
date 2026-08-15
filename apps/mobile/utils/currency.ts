/**
 * Turkish currency formatting — always use this helper for money UI.
 * Example: formatCurrency(2500) → "2.500,00 ₺"
 */
export function formatCurrency(
  value: number | string | null | undefined,
  currencySymbol = '₺',
): string {
  const amount = Number(value ?? 0);
  const safe = Number.isFinite(amount) ? amount : 0;
  const fixed = safe.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withDots},${decPart} ${currencySymbol}`;
}
