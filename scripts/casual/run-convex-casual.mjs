import { execSync, spawnSync } from "node:child_process";
import { CASUAL_CONVEX_PROJECT_DIR } from "./convex-casual-target.mjs";

/** cmd.exe: wrap arg in double quotes; internal `"` → `""`. */
function escapeCmdExeDoubleQuotedArg(s) {
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * `npx convex run <ref> '<json>' ...extra` — JSON must survive Windows `shell: true`
 * (spawnSync array + shell strips/consumes quotes and breaks Convex JSON5 parse).
 */
export function runConvexCasual(functionRef, args, convexArgs = []) {
  const cwd = CASUAL_CONVEX_PROJECT_DIR;
  const payload = JSON.stringify(args);

  if (process.platform === "win32") {
    const quotedPayload = escapeCmdExeDoubleQuotedArg(payload);
    const tail = convexArgs.length ? ` ${convexArgs.join(" ")}` : "";
    const cmd = `npx convex run ${functionRef} ${quotedPayload}${tail}`;
    try {
      const stdout = execSync(cmd, {
        cwd,
        encoding: "utf8",
        shell: true,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      return parseConvexStdout(stdout);
    } catch (e) {
      const stderr = typeof e.stderr === "string" ? e.stderr : e.stderr?.toString?.() ?? "";
      const stdout = typeof e.stdout === "string" ? e.stdout : e.stdout?.toString?.() ?? "";
      const msg = [stderr, stdout, e.message].filter(Boolean).join("\n").trim();
      throw new Error(msg || `convex run failed: ${functionRef}`);
    }
  }

  const npxBin = "npx";
  const cmdArgs = ["convex", "run", functionRef, payload, ...convexArgs];
  const result = spawnSync(npxBin, cmdArgs, {
    encoding: "utf8",
    stdio: "pipe",
    cwd,
  });
  if (result.error) {
    throw new Error(
      `${result.error.message}\n(hint: ensure Node/npm on PATH; casual cwd=${CASUAL_CONVEX_PROJECT_DIR})`
    );
  }
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").trim();
    throw new Error(err || `convex run failed: ${functionRef} (exit ${result.status})`);
  }
  return parseConvexStdout(result.stdout || "");
}

function parseConvexStdout(stdout) {
  const out = String(stdout).trim();
  if (!out) return null;
  try {
    return JSON.parse(out);
  } catch {
    return out;
  }
}
