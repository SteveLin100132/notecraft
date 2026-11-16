// run-root.mjs 的型別（docs/notecraft-multi-instance.md §5、§6）。

export const RUN_ROOT_LAYOUT: number;
export const RUN_STAMP_FILE: ".nc-run.json";
export const STATE_DIR: ".nc-state";
export const LOCK_FILE: "run.lock.json";

export interface RunStamp {
  layout: number;
  appVersion: string;
  appRoot: string;
}

export interface RunCurrent extends RunStamp {
  devPackage: boolean;
  linkOk: boolean;
}

export interface LockInfo {
  pid: number;
  command: string;
  url?: string | null;
  startedAt?: string;
}

export function runRootDirFor(cacheDir: string): string;
export function runRootEntries(pkgFiles: readonly string[]): string[];
export function needsResync(stamp: unknown, current: RunCurrent): { resync: boolean; why: string };
export function lockState(lock: unknown, isAlive: (pid: number) => boolean): "free" | "held" | "stale";
export function formatLockMessage(lock: LockInfo): string;

export function isPidAlive(pid: number): boolean;
export function ensureRunRoot(opts: {
  appRoot: string;
  cacheDir: string;
  appVersion: string;
  devPackage?: boolean;
  log?: (msg: string) => void;
}): string;
export function acquireLock(
  cacheDir: string,
  info: { command: string; url?: string | null },
): { ok: true; release: () => void } | { ok: false; lock: LockInfo };
