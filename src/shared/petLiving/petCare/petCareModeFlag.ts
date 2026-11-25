/** Mutable care-mode flag — WorldScene writes, interaction layer reads (presentation only). */
let petCareModeActive = false;

export function setPetCareModeActive(active: boolean): void {
  petCareModeActive = active;
}

export function isPetCareModeActive(): boolean {
  return petCareModeActive;
}