export declare const PRIVATE_CHECKSUM_MANIFEST_REL: string;
export declare const REQUIRED_PRIVATE_UNIFIED_FILES: readonly string[];
export declare const REQUIRED_PRIVATE_AUDIO_FILES: readonly string[];
export declare const REQUIRED_PRIVATE_RUNTIME_FILES: readonly string[];
export declare const FORBIDDEN_SYNC_REGEX: RegExp;

export interface PrivateAssetVerifyResult {
  ok: boolean;
  missing: string[];
  errors: string[];
  warnings: string[];
  checksums: Record<string, { sha256: string; bytes: number }>;
}

export interface PrivateAssetSyncResult {
  ok: boolean;
  copied: string[];
  missing: string[];
  errors: string[];
  manifestPath?: string | null;
}

export declare function verifyPrivateAssets(
  repoRoot: string,
  options?: { checksumManifestPath?: string },
): PrivateAssetVerifyResult;

export declare function writePrivateChecksumManifest(
  repoRoot: string,
): PrivateAssetVerifyResult & { manifestPath: string | null };

export declare function syncPrivateAssets(opts: {
  fromDir: string;
  toDir: string;
}): PrivateAssetSyncResult;
