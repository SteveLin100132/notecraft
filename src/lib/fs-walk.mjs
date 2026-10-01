// 目錄走訪時「跟隨 symlink」的共用讀取器。
//
// 為什麼要有這支：`readdir({ withFileTypes: true })` 回傳的 Dirent 對 symlink
// 的 isDirectory() / isFile() 一律是 false，所以指向資料夾的 symlink 會被走訪靜默略過
// （筆記資料夾裡掛一條 symlink 進來，build 看不到、serve 不重建）。
// 這裡改用 stat（會跟隨連結）判斷型別，並處理兩種跟隨 symlink 必然出現的情況：
//   1. 循環（連結指回自己的祖先）—— 以「目前這條走訪鏈上的 realpath 集合」偵測，命中就略過
//   2. 懸空連結（目標不存在）—— 略過，不報錯、不中斷走訪
//
// 用法：呼叫端遞迴時把 entry.chain 傳回下一層，循環偵測才有狀態可用：
//   async function walk(dir, chain) {
//     for (const e of await readdirFollow(dir, chain)) {
//       if (e.isDirectory()) await walk(path.join(dir, e.name), e.chain);
//     }
//   }
// 讀取失敗（權限、競態）行為與原本一致：回傳空陣列。

import { promises as fs, readdirSync, realpathSync, statSync } from "node:fs";
import path from "node:path";

/** @typedef {{ name: string, isDirectory(): boolean, isFile(): boolean, chain: Set<string> }} FollowEntry */

function resolveEntry(dirent, chain, stat, real) {
  // stat 為 null 代表懸空連結；real 只在連結成功解析時有值
  let isDir = false;
  let isFile = false;
  if (!dirent.isSymbolicLink()) {
    isDir = dirent.isDirectory();
    isFile = dirent.isFile();
  } else if (stat) {
    isFile = stat.isFile();
    // 指向祖先（或自己）的資料夾連結 = 循環，當作不是資料夾，走訪就不會進去
    isDir = stat.isDirectory() && !chain.has(real);
  }
  return { name: dirent.name, isDirectory: () => isDir, isFile: () => isFile, chain };
}

function chainOf(dir, ancestors) {
  const chain = new Set(ancestors);
  try {
    chain.add(realpathSync(dir));
  } catch {
    chain.add(path.resolve(dir));
  }
  return chain;
}

/** @returns {Promise<FollowEntry[]>} */
export async function readdirFollow(dir, ancestors = new Set()) {
  let dirents;
  try {
    dirents = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const chain = chainOf(dir, ancestors);
  const out = [];
  for (const d of dirents) {
    let stat = null;
    let real = "";
    if (d.isSymbolicLink()) {
      const abs = path.join(dir, d.name);
      try {
        stat = await fs.stat(abs);
        real = await fs.realpath(abs);
      } catch {
        stat = null; // 懸空連結
      }
    }
    out.push(resolveEntry(d, chain, stat, real));
  }
  return out;
}

/** 同步版（給 src/lib 下的 sync 走訪用）。 @returns {FollowEntry[]} */
export function readdirFollowSync(dir, ancestors = new Set()) {
  let dirents;
  try {
    dirents = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const chain = chainOf(dir, ancestors);
  return dirents.map((d) => {
    let stat = null;
    let real = "";
    if (d.isSymbolicLink()) {
      const abs = path.join(dir, d.name);
      try {
        stat = statSync(abs);
        real = realpathSync(abs);
      } catch {
        stat = null;
      }
    }
    return resolveEntry(d, chain, stat, real);
  });
}
