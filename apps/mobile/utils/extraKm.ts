/** Client-side mirror of public.calculate_extra_km_charge */
export function calculateExtraKmCharge(input: {
  kmLimit: number | null | undefined;
  startKm: number | null | undefined;
  endKm: number | null | undefined;
  extraKmPrice: number | null | undefined;
}): number {
  if (
    input.kmLimit == null ||
    input.startKm == null ||
    input.endKm == null ||
    input.endKm < input.startKm
  ) {
    return 0;
  }
  const used = input.endKm - input.startKm;
  const extra = Math.max(0, used - input.kmLimit);
  return extra * (input.extraKmPrice ?? 0);
}
