type Rect = { x: number; y: number; w: number; h: number };

interface Manifest {
  textures: Record<string, { file: string; width: number; height: number }>;
  entries: {
    id: string;
    texture: string;
    rect: Rect;
    anchor: { ox: number; oy: number };
    source: { license: string; credit: string; version: string };
  }[];
}

export const starterBounds: Record<string, [number, number, number, number]>;
export function validateAtlas(manifest: Manifest, expectedIds?: string[]): void;
export function buildUnifiedAtlas(options?: {
  output?: string;
  packRoot?: string;
  warn?: (message: string) => void;
}): Manifest;
