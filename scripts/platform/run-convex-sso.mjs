import { execSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SSO_CONVEX_PROJECT_DIR = path.resolve(__dirname, "../../src/convex/sso");

function escapeCmdExeDoubleQuotedArg(s) {
  return `"${s.replace(/"/g, '""')}"`;
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

export function runConvexSso(functionRef, args, convexArgs = []) {
  const cwd = SSO_CONVEX_PROJECT_DIR;
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
      // Windows: convex CLI sometimes crashes after success (UV_HANDLE_CLOSING).
      // Prefer a parseable ok payload from stdout over the process exit code.
      const recovered = parseConvexStdout(stdout);
      if (recovered && typeof recovered === "object" && recovered.ok === true) {
        if (stderr.trim()) {
          console.warn("[run-convex-sso] convex exited non-zero after ok result; ignoring Windows CLI crash");
        }
        return recovered;
      }
      const msg = [stderr, stdout, e.message].filter(Boolean).join("\n").trim();
      throw new Error(msg || `convex run failed: ${functionRef}`);
    }
  }

  const result = spawnSync("npx", ["convex", "run", functionRef, payload, ...convexArgs], {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `convex run failed: ${functionRef}`);
  }
  return parseConvexStdout(result.stdout || "");
}
