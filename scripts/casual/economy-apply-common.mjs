/**
 * apply-tune / apply-wallet / apply-gem / apply-voucher 共享参数与 tune 加载。
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(__dirname, "..", "..");

export function parseApplyArgs(argv) {
  const out = { write: false, fromPath: null, forward: [], help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--write") out.write = true;
    else if (a === "--dry-run") out.write = false;
    else if (a === "--from") out.fromPath = argv[++i];
    else if (a === "--help" || a === "-h") out.help = true;
    else out.forward.push(a);
  }
  return out;
}

export function runTuneJson(forwardArgs) {
  const tuneScript = join(__dirname, "economy-tune.mjs");
  const json = execFileSync(process.execPath, [tuneScript, ...forwardArgs, "--json"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(json);
}

export function loadTune(cli) {
  if (cli.fromPath) return JSON.parse(readFileSync(cli.fromPath, "utf8"));
  return runTuneJson(cli.forward);
}
