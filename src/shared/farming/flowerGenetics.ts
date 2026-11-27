/**
 * Flower genetics, lazy crossbreeding, decorative flower beds, and hybrid album.
 *
 * Transplanted directly from `Shiz0id/webfarmville` @ c420bc253f5de9dbaec636a729f4b4b2866248c4
 * Original sources: shared/src/features/blooms.ts & shared/src/content/blooms.ts
 * (SPDX-License-Identifier: MIT).
 */
import type { WeatherId } from '../donor/webfarmville-c420bc2/weatherRules.ts';
import { createRng, type Rng } from '../rng.ts';
import type { QualityTier } from './types.ts';

export type FlowerSpeciesId = 'tulip' | 'rose' | 'wild';

export interface FlowerBreedSpec {
  readonly sku: string;
  readonly seedSku: string | null;
  readonly nameVi: string;
  readonly species: FlowerSpeciesId;
  readonly hybrid: boolean;
  readonly colorHex: string;
  readonly stemHex: string;
}

export interface FlowerGeneticRecipe {
  readonly id: string;
  readonly parentA: string;
  readonly parentB: string;
  readonly child: string;
  /** Probability [0..1] when two matching flowers breed. */
  readonly odds: number;
  /** Optional wet-weather requirement (rain/storm/manually watered). */
  readonly wetOnly?: boolean;
  readonly hintVi: string;
}

export const BLOOM_PERIOD_MS = 6 * 3_600_000;
export const BLOOM_CHANCE = 0.30;
export const WATERED_MULT = 2.0;
export const LONE_CLONE_CHANCE = 0.20;
export const MAX_SPROUTS_PER_ROUND = 3;
export const FLOWER_BED_COLS = 8;
export const FLOWER_BED_ROWS = 5;
export const FLOWER_BED_SLOTS = FLOWER_BED_COLS * FLOWER_BED_ROWS; // 40 beds

export const FLOWER_SPECIES_CATALOG: readonly FlowerBreedSpec[] = [
  // 10 Base Planted Flowers
  { sku: 'rose_pink', seedSku: 'seed_rose_pink', nameVi: 'Hồng phấn', species: 'rose', hybrid: false, colorHex: '#f48fb1', stemHex: '#4f8c36' },
  { sku: 'rose_red', seedSku: 'seed_rose_red', nameVi: 'Hồng đỏ', species: 'rose', hybrid: false, colorHex: '#d92638', stemHex: '#3c7a2e' },
  { sku: 'rose_white', seedSku: 'seed_rose_white', nameVi: 'Hồng trắng', species: 'rose', hybrid: false, colorHex: '#fff9f5', stemHex: '#3c7a2e' },
  { sku: 'tulip_red', seedSku: 'seed_tulip_red', nameVi: 'Tulip đỏ', species: 'tulip', hybrid: false, colorHex: '#e03c4a', stemHex: '#4f8c36' },
  { sku: 'tulip_yellow', seedSku: 'seed_tulip_yellow', nameVi: 'Tulip vàng', species: 'tulip', hybrid: false, colorHex: '#f5cb36', stemHex: '#4f8c36' },
  { sku: 'tulip_pink', seedSku: 'seed_tulip_pink', nameVi: 'Tulip hồng', species: 'tulip', hybrid: false, colorHex: '#f489ab', stemHex: '#4f8c36' },
  { sku: 'tulip_purple', seedSku: 'seed_tulip_purple', nameVi: 'Tulip tím', species: 'tulip', hybrid: false, colorHex: '#9b59d0', stemHex: '#4f8c36' },
  { sku: 'lavender', seedSku: 'seed_lavender', nameVi: 'Oải hương', species: 'wild', hybrid: false, colorHex: '#9c7ae0', stemHex: '#4f8c36' },
  { sku: 'blue_jazz', seedSku: 'seed_blue_jazz', nameVi: 'Cúc thanh lam', species: 'wild', hybrid: false, colorHex: '#4a7ae8', stemHex: '#4f8c36' },
  { sku: 'fairy_rose', seedSku: 'seed_fairy_rose', nameVi: 'Hồng tiên', species: 'wild', hybrid: false, colorHex: '#f0a0d8', stemHex: '#4f8c36' },
  // 10 Rare Hybrids (bred from adjacency only)
  { sku: 'tulip_orange', seedSku: null, nameVi: 'Tulip cam', species: 'tulip', hybrid: true, colorHex: '#f5842a', stemHex: '#4f8c36' },
  { sku: 'tulip_white', seedSku: null, nameVi: 'Tulip trắng tuyết', species: 'tulip', hybrid: true, colorHex: '#f8fafc', stemHex: '#4f8c36' },
  { sku: 'tulip_black', seedSku: null, nameVi: 'Tulip huyền đêm', species: 'tulip', hybrid: true, colorHex: '#382a45', stemHex: '#4d6b52' },
  { sku: 'tulip_rainbow', seedSku: null, nameVi: 'Tulip cầu vồng', species: 'tulip', hybrid: true, colorHex: '#ff6ca8', stemHex: '#7cc04f' },
  { sku: 'rose_sakura', seedSku: null, nameVi: 'Anh đào', species: 'rose', hybrid: true, colorHex: '#ffc1d6', stemHex: '#4f8c36' },
  { sku: 'rose_yellow', seedSku: null, nameVi: 'Hồng vàng nắng', species: 'rose', hybrid: true, colorHex: '#ffe052', stemHex: '#3c7a2e' },
  { sku: 'rose_orange', seedSku: null, nameVi: 'Hồng cam hoàng hôn', species: 'rose', hybrid: true, colorHex: '#f5762e', stemHex: '#3c7a2e' },
  { sku: 'rose_lavender', seedSku: null, nameVi: 'Hồng oải hương', species: 'rose', hybrid: true, colorHex: '#b58de8', stemHex: '#3c7a2e' },
  { sku: 'rose_blue', seedSku: null, nameVi: 'Hồng xanh lam', species: 'rose', hybrid: true, colorHex: '#4682f0', stemHex: '#3c7a2e' },
  { sku: 'rose_gold', seedSku: null, nameVi: 'Hồng vàng kim', species: 'rose', hybrid: true, colorHex: '#ffd43b', stemHex: '#5a7a32' },
];

export const FLOWER_SPEC_BY_SKU: ReadonlyMap<string, FlowerBreedSpec> = new Map(
  FLOWER_SPECIES_CATALOG.map((f) => [f.sku, f]),
);

/**
 * Exact 9 Meadowbrook crossbreeding formulas + OLW Sakura Rose rule.
 */
export const FLOWER_GENETICS_RECIPES: readonly FlowerGeneticRecipe[] = [
  {
    id: 'tulip_orange',
    parentA: 'tulip_red',
    parentB: 'tulip_yellow',
    child: 'tulip_orange',
    odds: 0.5,
    hintVi: 'Tulip đỏ cạnh tulip vàng thường nở ra tulip cam rực như lòng đỏ trứng!',
  },
  {
    id: 'tulip_white',
    parentA: 'tulip_pink',
    parentB: 'tulip_purple',
    child: 'tulip_white',
    odds: 0.5,
    hintVi: 'Trồng tulip hồng kế bên tulip tím để gieo mầm tulip trắng tuyết.',
  },
  {
    id: 'tulip_black',
    parentA: 'tulip_purple',
    parentB: 'tulip_white',
    child: 'tulip_black',
    odds: 0.3,
    hintVi: 'Tương truyền tulip tím ghép với tulip trắng tuyết sẽ ra tulip đen huyền.',
  },
  {
    id: 'tulip_rainbow',
    parentA: 'tulip_orange',
    parentB: 'tulip_white',
    child: 'tulip_rainbow',
    odds: 0.2,
    hintVi: 'Tulip cam cạnh tulip trắng tuyết đôi khi bừng sáng đủ bảy sắc cầu vồng.',
  },
  {
    id: 'rose_yellow',
    parentA: 'rose_white',
    parentB: 'rose_pink',
    child: 'rose_yellow',
    odds: 0.5,
    hintVi: 'Hồng trắng và hồng phấn trồng sát nhau dễ nảy ra hồng vàng nắng.',
  },
  {
    id: 'rose_orange',
    parentA: 'rose_red',
    parentB: 'rose_yellow',
    child: 'rose_orange',
    odds: 0.45,
    hintVi: 'Hồng đỏ và hồng vàng nắng hòa sắc thành hồng cam hoàng hôn.',
  },
  {
    id: 'rose_lavender',
    parentA: 'rose_red',
    parentB: 'rose_white',
    child: 'rose_lavender',
    odds: 0.4,
    hintVi: 'Hồng đỏ pha cùng hồng trắng cho ra sắc tím oải hương dịu mắt.',
  },
  {
    id: 'rose_blue',
    parentA: 'rose_lavender',
    parentB: 'rose_orange',
    child: 'rose_blue',
    odds: 0.2,
    hintVi: 'Lai hồng oải hương với hồng cam hoàng hôn để tìm hồng xanh lam hiếm.',
  },
  {
    id: 'rose_gold',
    parentA: 'rose_blue',
    parentB: 'rose_yellow',
    child: 'rose_gold',
    odds: 0.25,
    hintVi: 'Khi hồng xanh lam gặp hồng vàng nắng — đóa hồng vàng kim quý giá nhất nở rộ.',
  },
  {
    id: 'rose_sakura',
    parentA: 'rose_pink',
    parentB: 'rose_pink',
    child: 'rose_sakura',
    odds: 0.35,
    hintVi: 'Hai khóm hồng phấn cạnh nhau có cơ hội hé nở đóa hồng sakura.',
  },
];

export function findGeneticRecipeForPair(a: string, b: string): FlowerGeneticRecipe | undefined {
  return FLOWER_GENETICS_RECIPES.find(
    (r) => (r.parentA === a && r.parentB === b) || (r.parentA === b && r.parentB === a),
  );
}

export interface PlantedBedFlower {
  readonly slotIndex: number;
  readonly flowerSku: string;
  readonly plantedAtMs: number;
  readonly wateredPeriod: number | null;
  readonly plantedBy: string;
  readonly hybrid: boolean;
}

export interface FlowerGardenState {
  readonly beds: ReadonlyArray<PlantedBedFlower | null>;
  readonly lastBreedPeriod: number | null;
  /** Hybrid & base flower SKUs unlocked in the couple's shared Album. */
  readonly discovered: readonly string[];
}

export function createFlowerGarden(discovered: readonly string[] = []): FlowerGardenState {
  return {
    beds: Array.from({ length: FLOWER_BED_SLOTS }, () => null),
    lastBreedPeriod: null,
    discovered: [...new Set(discovered)],
  };
}

export function bloomPeriodAt(nowMs: number): number {
  return Math.floor(Math.max(0, nowMs) / BLOOM_PERIOD_MS);
}

const BED_NEIGHBORS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

export function bedNeighbors(slotIndex: number): number[] {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= FLOWER_BED_SLOTS) return [];
  const x = slotIndex % FLOWER_BED_COLS;
  const y = Math.floor(slotIndex / FLOWER_BED_COLS);
  const out: number[] = [];
  for (const [dx, dy] of BED_NEIGHBORS) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= FLOWER_BED_COLS || ny < 0 || ny >= FLOWER_BED_ROWS) continue;
    out.push(ny * FLOWER_BED_COLS + nx);
  }
  return out;
}

export function plantFlowerInBed(
  garden: FlowerGardenState,
  slotIndex: number,
  flowerSku: string,
  nowMs: number,
  actorId: string,
):
  | { ok: true; garden: FlowerGardenState; newlyDiscovered: boolean }
  | { ok: false; code: string; messageVi: string } {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= FLOWER_BED_SLOTS) {
    return { ok: false, code: 'INVALID_SLOT', messageVi: 'Ô bồn hoa không hợp lệ.' };
  }
  const spec = FLOWER_SPEC_BY_SKU.get(flowerSku);
  if (!spec) {
    return { ok: false, code: 'UNKNOWN_FLOWER', messageVi: 'Loài hoa không tồn tại trong sổ hoa.' };
  }
  if (garden.beds[slotIndex] !== null) {
    return { ok: false, code: 'BED_OCCUPIED', messageVi: 'Ô hoa này đã trồng hoa rồi.' };
  }
  const beds = garden.beds.slice();
  beds[slotIndex] = {
    slotIndex,
    flowerSku,
    plantedAtMs: nowMs,
    wateredPeriod: null,
    plantedBy: actorId,
    hybrid: spec.hybrid,
  };
  const newlyDiscovered = !garden.discovered.includes(flowerSku);
  const discovered = newlyDiscovered ? [...garden.discovered, flowerSku] : garden.discovered;
  return {
    ok: true,
    garden: { ...garden, beds, discovered },
    newlyDiscovered,
  };
}

export function waterFlowerInBed(
  garden: FlowerGardenState,
  slotIndex: number,
  nowMs: number,
):
  | { ok: true; garden: FlowerGardenState }
  | { ok: false; code: string; messageVi: string } {
  const bed = garden.beds[slotIndex];
  if (!bed) return { ok: false, code: 'EMPTY_BED', messageVi: 'Ô này chưa có hoa để tưới.' };
  const period = bloomPeriodAt(nowMs);
  if (bed.wateredPeriod === period) {
    return { ok: false, code: 'ALREADY_WATERED', messageVi: 'Khóm hoa đã được tưới trong nhịp này rồi.' };
  }
  const beds = garden.beds.slice();
  beds[slotIndex] = { ...bed, wateredPeriod: period };
  return { ok: true, garden: { ...garden, beds } };
}

export function harvestFlowerFromBed(
  garden: FlowerGardenState,
  slotIndex: number,
  rng: Rng,
):
  | { ok: true; garden: FlowerGardenState; sku: string; quality: QualityTier }
  | { ok: false; code: string; messageVi: string } {
  const bed = garden.beds[slotIndex];
  if (!bed) return { ok: false, code: 'EMPTY_BED', messageVi: 'Ô bồn hoa đang trống.' };
  const spec = FLOWER_SPEC_BY_SKU.get(bed.flowerSku);
  const roll = rng();
  const quality: QualityTier = spec?.hybrid
    ? roll < 0.35
      ? 'gold'
      : 'silver'
    : roll < 0.15
      ? 'gold'
      : roll < 0.45
        ? 'silver'
        : 'normal';
  const beds = garden.beds.slice();
  beds[slotIndex] = null;
  const discovered = garden.discovered.includes(bed.flowerSku)
    ? garden.discovered
    : [...garden.discovered, bed.flowerSku];
  return {
    ok: true,
    garden: { ...garden, beds, discovered },
    sku: bed.flowerSku,
    quality,
  };
}

export interface FlowerSproutEvent {
  readonly slotIndex: number;
  readonly flowerSku: string;
  readonly hybrid: boolean;
  readonly firstDiscovery: boolean;
  readonly parents: readonly [string, string] | readonly [string];
}

/**
 * Pure lazy crossbreeding tick derived from `webfarmville/features/blooms.ts`.
 * Evaluates eligible period transitions cleanly from timestamps; zero running cron required.
 */
export function runFlowerCrossbreedingRound(
  garden: FlowerGardenState,
  nowMs: number,
  rng: Rng,
  weatherId: WeatherId = 'sunny',
): {
  readonly garden: FlowerGardenState;
  readonly sprouts: readonly FlowerSproutEvent[];
} {
  const currentPeriod = bloomPeriodAt(nowMs);
  if (garden.lastBreedPeriod === null) {
    return { garden: { ...garden, lastBreedPeriod: currentPeriod }, sprouts: [] };
  }
  if (currentPeriod <= garden.lastBreedPeriod) {
    return { garden, sprouts: [] };
  }

  const wetSky = weatherId === 'rain' || weatherId === 'storm';
  const beds = garden.beds.slice();
  const discovered = [...garden.discovered];
  const sprouts: FlowerSproutEvent[] = [];

  // Process up to 4 missed periods safely so long absences gently sprout buds without flooding beds.
  const roundsToRun = Math.min(4, currentPeriod - garden.lastBreedPeriod);
  for (let roundOffset = 0; roundOffset < roundsToRun; roundOffset += 1) {
    const roundPeriod = currentPeriod - roundsToRun + roundOffset;
    const usedSlots = new Set<number>();
    let roundSprouts = 0;

    for (let idx = 0; idx < beds.length && roundSprouts < MAX_SPROUTS_PER_ROUND; idx += 1) {
      const parent = beds[idx];
      if (!parent || usedSlots.has(idx)) continue;
      const spec = FLOWER_SPEC_BY_SKU.get(parent.flowerSku);
      if (!spec) continue;

      const watered = wetSky || parent.wateredPeriod === roundPeriod || parent.wateredPeriod !== null;
      const chance = BLOOM_CHANCE * (watered ? WATERED_MULT : 1);
      if (rng() >= chance) continue;
      usedSlots.add(idx);

      const neighbors = bedNeighbors(idx);
      const mateSlots = neighbors.filter((nIdx) => {
        const m = beds[nIdx];
        if (!m || usedSlots.has(nIdx)) return false;
        return FLOWER_SPEC_BY_SKU.get(m.flowerSku)?.species === spec.species;
      });

      let childSku: string;
      let parentPair: readonly [string, string] | readonly [string];
      let candidateSpots: number[];

      if (mateSlots.length > 0) {
        const mateIdx = mateSlots[Math.floor(rng() * mateSlots.length) % mateSlots.length]!;
        const mate = beds[mateIdx]!;
        usedSlots.add(mateIdx);

        const recipe = findGeneticRecipeForPair(parent.flowerSku, mate.flowerSku);
        if (recipe && (!recipe.wetOnly || watered) && rng() < recipe.odds) {
          childSku = recipe.child;
        } else {
          childSku = rng() < 0.5 ? parent.flowerSku : mate.flowerSku;
        }
        parentPair = [parent.flowerSku, mate.flowerSku];
        candidateSpots = [
          ...neighbors,
          ...bedNeighbors(mateIdx),
        ].filter((s, pos, arr) => arr.indexOf(s) === pos && beds[s] === null);
      } else {
        if (rng() >= LONE_CLONE_CHANCE) continue;
        childSku = parent.flowerSku;
        parentPair = [parent.flowerSku];
        candidateSpots = neighbors.filter((s) => beds[s] === null);
      }

      if (candidateSpots.length === 0) continue;
      const targetSlot = candidateSpots[Math.floor(rng() * candidateSpots.length) % candidateSpots.length]!;
      const childSpec = FLOWER_SPEC_BY_SKU.get(childSku);
      const hybrid = Boolean(childSpec?.hybrid);
      const firstDiscovery = !discovered.includes(childSku);
      if (firstDiscovery) discovered.push(childSku);

      beds[targetSlot] = {
        slotIndex: targetSlot,
        flowerSku: childSku,
        plantedAtMs: nowMs,
        wateredPeriod: null,
        plantedBy: 'hybrid-garden',
        hybrid,
      };
      usedSlots.add(targetSlot);
      roundSprouts += 1;
      sprouts.push({
        slotIndex: targetSlot,
        flowerSku: childSku,
        hybrid,
        firstDiscovery,
        parents: parentPair,
      });
    }
  }

  return {
    garden: {
      beds,
      lastBreedPeriod: currentPeriod,
      discovered,
    },
    sprouts,
  };
}

export function deterministicFlowerRng(seed: number, nowMs: number): Rng {
  const stream = createRng(seed + bloomPeriodAt(nowMs) * 1013);
  return () => stream.next();
}
