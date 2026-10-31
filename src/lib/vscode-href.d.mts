/** 只需要 resolve；傳 node:path、path.win32 或 path.posix 都可以。 */
export interface PathResolver {
  resolve(...segments: string[]): string;
}

export function noteAbsPath(filePath: string | undefined, id: string, cwd: string, p: PathResolver): string;

export function toVscodeHref(absPath: string): string;
