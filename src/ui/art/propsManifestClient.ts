import { ART_ATLAS_PATH } from '../../game/art/atlasProfile';
import type { PropsManifest } from '../../shared/art/propsManifestTypes';
import { findPropsManifestRect } from '../../shared/art/propsManifestTypes';

let cached: PropsManifest | null = null;
let inflight: Promise<PropsManifest> | null = null;

export function loadPropsManifest(): Promise<PropsManifest> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetch(`${ART_ATLAS_PATH}/props-manifest.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`props-manifest HTTP ${res.status}`);
        return res.json() as Promise<PropsManifest>;
      })
      .then((manifest) => {
        cached = manifest;
        return manifest;
      });
  }
  return inflight;
}

export function propsIconBackgroundStyle(
  manifest: PropsManifest,
  iconId: string,
  size: number,
): { backgroundImage: string; backgroundPosition: string; backgroundSize: string } | null {
  const rect = findPropsManifestRect(manifest, iconId);
  if (!rect) return null;
  const { width: tw, height: th } = manifest.texture;
  const scale = size / Math.max(rect.w, rect.h, 1);
  return {
    backgroundImage: `url(${ART_ATLAS_PATH}/world-props.png)`,
    backgroundPosition: `${-rect.x * scale}px ${-rect.y * scale}px`,
    backgroundSize: `${tw * scale}px ${th * scale}px`,
  };
}

/** Test-only reset between jsdom cases. */
export function resetPropsManifestClientCacheForTests(): void {
  cached = null;
  inflight = null;
}