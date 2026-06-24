#!/usr/bin/env node
/**
 * 按 economy:tune 钻净流建议写配表（默认 C 档入场钻单旋钮）。
 *
 *   npm run casual:economy:apply-gem -- --profile casual
 *   npm run casual:economy:apply-gem -- --config scripts/casual/economy-tune.example.json --write
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadTune, parseApplyArgs, REPO_ROOT } from "./economy-apply-common.mjs";

const PATHS = {
  seasonConstants: join(
    REPO_ROOT,
    "src/convex/casualPlatform/convex/data/casualSeasonEconomyConstants.ts"
  ),
  tournamentConfigs: join(
    REPO_ROOT,
    "src/convex/casualPlatform/convex/data/casualTournamentConfigs.ts"
  ),
};

const C_MATCH_TYPES = new Set(["tournament_c", "triathlon_c"]);
const ENTRY_GEMS_CONSTANT = "ASYNC_ENTRY_GEMS_C";

/** @returns {{ skip?: boolean, reason?: string, delta?: number, weeklyGames?: number, gap?: number, desc?: string }} */
export function planGemDelta(tune) {
  const gemPlan = tune.recommendations?.gems;
  if (!gemPlan) return { skip: true, reason: "无钻建议" };

  const gap = Number(gemPlan.gap);
  if (!Number.isFinite(gap) || Math.abs(gap) < 2) {
    return { skip: true, reason: "钻净流已接近目标（|gap| < 2）" };
  }

  const daily = tune.profile?.daily ?? {};
  const weeklyC = (daily.C ?? 0) * 7;
  if (weeklyC <= 0) {
    return { skip: true, reason: "画像日 C 局为 0，无法自动调 C 入场钻" };
  }

  const delta = gap < 0 ? Math.ceil(-gap / weeklyC) : -Math.ceil(gap / weeklyC);
  if (delta === 0) {
    return { skip: true, reason: "计算增量为 0" };
  }

  const direction = delta > 0 ? "抬" : "降";
  return {
    delta,
    gap,
    weeklyGames: weeklyC,
    desc: `${direction} C 入场钻 ${Math.abs(delta)}（周 ${weeklyC} 局 C，目标修正周净 ${gap > 0 ? "+" : ""}${gap}）`,
  };
}

function applyEntryGemsConstant(content, delta) {
  const re = new RegExp(`(export const ${ENTRY_GEMS_CONSTANT} = )(\\d+)(;)`);
  const next = content.replace(re, (_, p1, n, p3) => {
    const v = Math.max(0, Number(n) + delta);
    return `${p1}${v}${p3}`;
  });
  if (next === content) throw new Error(`未找到 ${ENTRY_GEMS_CONSTANT}（casualSeasonEconomyConstants.ts）`);
  return next;
}

function applyEntryGemsInTournamentConfigs(content, delta) {
  const lines = content.split("\n");
  let currentMatchType = null;
  let changes = 0;
  const out = [];

  for (const line of lines) {
    const mMatch = line.match(/matchType:\s*"([^"]+)"/);
    if (mMatch) currentMatchType = mMatch[1];

    const mEntry = line.match(/^(\s*)entry:\s*\{\s*kind:\s*"gems",\s*amount:\s*(\d+)\s*\},?\s*$/);
    if (mEntry && currentMatchType && C_MATCH_TYPES.has(currentMatchType)) {
      const newVal = Math.max(0, Number(mEntry[2]) + delta);
      changes += 1;
      out.push(`${mEntry[1]}entry: { kind: "gems", amount: ${newVal} },`);
      continue;
    }
    out.push(line);
  }

  return { content: out.join("\n"), changes };
}

function printHelp() {
  console.log(`
Casual 经济 · 按 tune 建议写钻入场（C 档单旋钮）

  npm run casual:economy:apply-gem -- --profile casual
  npm run casual:economy:apply-gem -- --config scripts/casual/economy-tune.example.json --write

选项：
  --write / --dry-run     是否写入（默认 dry-run）
  --from <tune.json>      使用已保存 tune --json
  其余参数透传给 economy:tune

写入：
  - casualSeasonEconomyConstants.ts   ASYNC_ENTRY_GEMS_C
  - casualTournamentConfigs.ts        tournament_c / triathlon_c 入场钻

写入后：npm run casual:economy:sync && npm run casual:economy:balance
`);
}

function main() {
  const cli = parseApplyArgs(process.argv.slice(2));
  if (cli.help) {
    printHelp();
    return;
  }

  const tune = loadTune(cli);
  const plan = planGemDelta(tune);

  console.log("Casual 经济 apply-gem");
  console.log("=".repeat(56));
  console.log(`模式: ${cli.write ? "写入" : "dry-run"}`);
  console.log(`Tune 画像: ${tune.profileKey ?? "?"}`);
  console.log("");

  if (plan.skip) {
    console.log(`跳过钻写表: ${plan.reason}`);
    return;
  }

  console.log(`■ ${plan.desc}`);
  console.log(`    常量 ${ENTRY_GEMS_CONSTANT} ${plan.delta > 0 ? "+" : ""}${plan.delta}`);
  console.log("");

  const constBefore = readFileSync(PATHS.seasonConstants, "utf8");
  const tourBefore = readFileSync(PATHS.tournamentConfigs, "utf8");

  const constAfter = applyEntryGemsConstant(constBefore, plan.delta);
  const tourResult = applyEntryGemsInTournamentConfigs(tourBefore, plan.delta);

  console.log(`    casualTournamentConfigs: ${tourResult.changes} 处 C 档 entry.gems`);

  if (!cli.write) {
    console.log("\n以上为计划变更。确认后加 --write 写入。");
    return;
  }

  if (constBefore !== constAfter) {
    writeFileSync(PATHS.seasonConstants, constAfter, "utf8");
    console.log(`已写入 ${PATHS.seasonConstants}`);
  }
  if (tourBefore !== tourResult.content) {
    writeFileSync(PATHS.tournamentConfigs, tourResult.content, "utf8");
    console.log(`已写入 ${PATHS.tournamentConfigs}`);
  }

  console.log("\n下一步: npm run casual:economy:sync && npm run casual:economy:balance");
}

main();
