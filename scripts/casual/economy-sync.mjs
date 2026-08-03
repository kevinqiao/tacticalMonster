#!/usr/bin/env node
/**
 * 从 casualPlatform 配表同步 economy-balance-data.mjs（供 balance / tune 使用）。
 *
 *   npm run casual:economy:sync          # 写入
 *   npm run casual:economy:sync:check    # 仅检查是否漂移（CI 友好）
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const SNAPSHOT_SCRIPT = join(__dirname, "economy-config-snapshot.ts");
const OUT_FILE = join(__dirname, "economy-balance-data.mjs");

function loadSnapshot() {
  const tsxCli = join(REPO_ROOT, "node_modules", "tsx", "dist", "cli.mjs");
  const json = execFileSync(process.execPath, [tsxCli, SNAPSHOT_SCRIPT], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(json);
}

function stripTournamentMeta(t) {
  const { sourceTournamentId, ...rest } = t;
  void sourceTournamentId;
  return rest;
}

function formatObject(obj, indent = 0) {
  const pad = "  ".repeat(indent);
  const lines = ["{"];

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    const k = /^[a-zA-Z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
    if (typeof value === "number" && Number.isFinite(value)) {
      const expr =
        key === "seasonMissionPassXpPerWeek"
          ? `${value} /* season_runs_60 / CASUAL_SEASON_NOMINAL_WEEKS */`
          : String(value);
      lines.push(`${pad}  ${k}: ${expr},`);
    } else if (typeof value === "boolean" || value === null) {
      lines.push(`${pad}  ${k}: ${JSON.stringify(value)},`);
    } else if (typeof value === "string") {
      lines.push(`${pad}  ${k}: ${JSON.stringify(value)},`);
    } else if (Array.isArray(value)) {
      lines.push(`${pad}  ${k}: [${value.join(", ")}],`);
    } else if (typeof value === "object") {
      lines.push(`${pad}  ${k}: ${formatObject(value, indent + 1)},`);
    }
  }

  lines.push(`${pad}}`);
  return lines.join("\n");
}

function generateModule(snapshot) {
  const tournaments = {
    A: stripTournamentMeta(snapshot.DEFAULT_TOURNAMENTS.A),
    B: stripTournamentMeta(snapshot.DEFAULT_TOURNAMENTS.B),
    C: stripTournamentMeta(snapshot.DEFAULT_TOURNAMENTS.C),
  };

  const header = `/**
 * AUTO-GENERATED — 勿手改。由配表同步：
 *   npm run casual:economy:sync
 * 源：casualSeasonEconomyConstants · casualPayoutPolicy · casualTournamentConfigs · casualMissionTemplates
 */
`;

  const body = `
export const PASS_XP_PER_LEVEL = ${snapshot.PASS_XP_PER_LEVEL};
export const PASS_MAX_LEVEL = ${snapshot.PASS_MAX_LEVEL};
export const CASUAL_SEASON_NOMINAL_WEEKS = ${snapshot.CASUAL_SEASON_NOMINAL_WEEKS};
export const CASUAL_F2P_PASS_TARGET_LEVELS = ${snapshot.CASUAL_F2P_PASS_TARGET_LEVELS};
export const CASUAL_F2P_PASS_TARGET_BAND = ${formatObject(snapshot.CASUAL_F2P_PASS_TARGET_BAND)};
export const DAILY_P75_COINS_SOFT_CAP = ${snapshot.DAILY_P75_COINS_SOFT_CAP};

export const NET_FLOW_BANDS = ${formatObject(snapshot.NET_FLOW_BANDS)};

export const DEFAULT_TOURNAMENTS = ${formatObject(tournaments)};

export const DEFAULT_P75 = ${formatObject(
    (() => {
      const { sourceTournamentId, ...rest } = snapshot.DEFAULT_P75;
      void sourceTournamentId;
      return rest;
    })()
  )};

export const SIGN_IN = ${formatObject(snapshot.SIGN_IN)};

export const DEFAULT_XP_DECAY_BY_ORDINAL = [${snapshot.DEFAULT_XP_DECAY_BY_ORDINAL.join(", ")}];

/** 日任务 Pass XP（不含签到） */
export const DAILY_MISSION_PASS_XP = ${snapshot.DAILY_MISSION_PASS_XP};

export const DEFAULT_WEEKLY = ${formatObject(snapshot.DEFAULT_WEEKLY)};

export const SEASON_CHALLENGE_VOUCHER_COST = ${snapshot.SEASON_CHALLENGE_VOUCHER_COST};

export const SHOP_SINK_BY_PROFILE = ${formatObject(snapshot.SHOP_SINK_BY_PROFILE)};
`;

  return header + body.trim() + "\n";
}

function main() {
  const checkOnly = process.argv.includes("--check");
  const snapshot = loadSnapshot();
  const next = generateModule(snapshot);
  const prev = readFileSync(OUT_FILE, "utf8");

  if (prev === next) {
    console.log("✓ economy-balance-data.mjs 已与配表同步");
    return;
  }

  if (checkOnly) {
    console.error("✗ economy-balance-data.mjs 与配表不同步。运行: npm run casual:economy:sync");
    console.error(
      `  源：${snapshot.generatedFrom.join("; ")} · DAILY_GROWTH_FULL_XP_GAMES=${snapshot.meta.dailyGrowthFullXpGames}`
    );
    process.exit(1);
  }

  writeFileSync(OUT_FILE, next, "utf8");
  console.log(`已写入 ${OUT_FILE}`);
  console.log(`  镜像 A/B/C ← ${snapshot.DEFAULT_TOURNAMENTS.A.sourceTournamentId} 等`);
  console.log(`  DAILY_GROWTH_FULL_XP_GAMES（配表）= ${snapshot.meta.dailyGrowthFullXpGames}`);
  console.log("  验收: npm run casual:economy:balance");
}

main();
