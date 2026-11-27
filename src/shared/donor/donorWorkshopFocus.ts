/** Hollow / Meadowbrook workshop UI section when opened from a world door. */
export type DonorWorkshopFocus = 'mill' | 'bakery' | 'coop';

export function parseDonorWorkshopFocus(raw: unknown): DonorWorkshopFocus | undefined {
  const id = String(raw ?? '');
  if (id === 'mill' || id === 'bakery' || id === 'coop') return id;
  return undefined;
}