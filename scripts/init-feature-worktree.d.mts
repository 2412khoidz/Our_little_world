export interface InitFeatureWorktreeOptions {
  repoRoot?: string;
  prefix?: string;
  name: string;
  dir?: string;
  canonical?: string;
  remote?: string;
  assetsFrom?: string;
  skipFetch?: boolean;
}

export interface InitFeatureWorktreeResult {
  ok: true;
  repoRoot: string;
  verifiedRef: string;
  startSha: string;
  startSubject: string;
  branchName: string;
  worktreePath: string;
  syncedFileCount: number;
  manifestPath: string | null;
}

export function initFeatureWorktree(
  options: InitFeatureWorktreeOptions,
): InitFeatureWorktreeResult;
