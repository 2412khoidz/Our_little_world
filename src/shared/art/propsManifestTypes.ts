export interface PropsManifestRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface PropsManifestEntry {
  readonly id: string;
  readonly rect: PropsManifestRect;
  readonly texture?: string;
}

export interface PropsManifest {
  readonly texture: {
    readonly file: string;
    readonly width: number;
    readonly height: number;
  };
  readonly entries: readonly PropsManifestEntry[];
}

export function findPropsManifestRect(
  manifest: PropsManifest,
  iconId: string,
): PropsManifestRect | null {
  return manifest.entries.find((entry) => entry.id === iconId)?.rect ?? null;
}