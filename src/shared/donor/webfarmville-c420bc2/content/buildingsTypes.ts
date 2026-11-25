/** Minimal building/recipe types for vendored `content/workshops.ts` (Meadowbrook). */
export interface RecipeDef {
  readonly id: string;
  readonly output: string;
  readonly qty: number;
  readonly inputs: Record<string, number>;
  readonly craftSec: number;
  readonly xp: number;
}

export interface BuildingDef {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly cost: number;
  readonly slots: number;
  readonly recipes: readonly RecipeDef[];
}