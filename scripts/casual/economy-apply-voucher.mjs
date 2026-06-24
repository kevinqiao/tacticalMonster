#!/usr/bin/env node
/**
 * 按 economy:tune 券净流建议写配表。
 * 默认：weekly_platform_runs_15 rewardVouchers；不足时抬 season_challenge 专场券耗。
 *
 *   npm run casual:economy:apply-voucher -- --profile casual
 *   npm run casual:economy:apply-voucher -- --config scripts/casual/economy-tune.example.json --write
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTune, parseApplyArgs, REPO_ROOT } from "./economy-apply-common.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PATHS = {
  missionTemplates: join(
    REPO_ROOT,
    "src/convex/casualPlatform/convex/data/casualMissionTemplates.ts"
  ),
  tournamentConfigs: join(
    REPO_ROOT,
    "src/convex/casualPlatform/convex/data/casualTournamentConfigs.ts"
  ),
  snapshot: join(__dirname, "economy-config-snapshot.ts"),
};

const RUNS_15_TASK_ID = "weekly_platform_runs_15";
const MISSION_VOUCHERS_ANCHOR_RE = /(missionVouchersExpect:\s*)([\d.]+)/;

/** @returns {{ skip?: boolean, reason?: string, steps?: object[], gap?: number }} */
export function planVoucherDelta(tune) {
  const voucherPlan = tune.recommendations?.vouchers;
  if (!voucherPlan) return { skip: true, reason: "无券建议" };

  const gap = Number(voucherPlan.gap);
  if (!Number.isFinite(gap) || Math.abs(gap) < 0.5) {
    return { skip: true, reason: "券净流已接近目标（|gap| < 0.5）" };
  }

  const profile = tune.profile ?? {};
  const missionMult = profile.completesWeeklyMissions ?? 1;
  const spotlightPerWeek = profile.spotlightPerWeek ?? 0;
  const steps = [];

  if (gap > 0) {
    if (missionMult <= 0) {
      return { skip: true, reason: "周任务完成率为 0，无法自动加券任务产出" };
    }
    const addReward = Math.ceil(gap / missionMult);
    steps.push({
      kind: "runs_15_reward",
      delta: addReward,
      desc: `weekly_platform_runs_15 rewardVouchers +${addReward}（×完成率 ${missionMult} ≈ 周净 +${gap}）`,
    });
    return { gap, steps };
  }

  let remaining = -gap;
  const currentReward = readRuns15RewardVouchers();
  if (missionMult > 0 && remaining > 0 && currentReward > 0) {
    const reduceReward = Math.min(currentReward, Math.ceil(remaining / missionMult));
    if (reduceReward > 0) {
      steps.push({
        kind: "runs_15_reward",
        delta: -reduceReward,
        desc: `weekly_platform_runs_15 rewardVouchers -${reduceReward}（×完成率 ${missionMult} ≈ 周净 -${reduceReward * missionMult}）`,
      });
      remaining -= reduceReward * missionMult;
    }
  }

  if (remaining > 0.15 && spotlightPerWeek > 0) {
    const increaseCost = Math.ceil(remaining / spotlightPerWeek);
    const currentCost = readSeasonChallengeVoucherCost();
    steps.push({
      kind: "spotlight_cost",
      delta: increaseCost,
      desc: `season_challenge 入场券 +${increaseCost}（${spotlightPerWeek} 场/周 ≈ 周净 -${increaseCost * spotlightPerWeek}）`,
      currentCost,
    });
    remaining -= increaseCost * spotlightPerWeek;
  }

  if (!steps.length) {
    return {
      skip: true,
      reason: `券净流偏高（gap ${gap}），无可用旋钮（检查画像 spotlight / 周任务完成率）`,
    };
  }

  if (remaining > 0.5) {
    steps.push({
      kind: "note",
      desc: `剩余缺口约 ${remaining.toFixed(1)}/周，apply 后请再跑 balance 或手调其它券任务`,
    });
  }

  return { gap, steps };
}

function readRuns15RewardVouchers() {
  const text = readFileSync(PATHS.missionTemplates, "utf8");
  const block = extractTaskBlock(text, RUNS_15_TASK_ID);
  const m = block.match(/rewardVouchers:\s*(\d+)/);
  return m ? Number(m[1]) : 0;
}

function readSeasonChallengeVoucherCost() {
  const text = readFileSync(PATHS.tournamentConfigs, "utf8");
  let currentMatchType = null;
  for (const line of text.split("\n")) {
    const mMatch = line.match(/matchType:\s*"([^"]+)"/);
    if (mMatch) currentMatchType = mMatch[1];
    const mEntry = line.match(/entry:\s*\{\s*kind:\s*"seasonVouchers",\s*amount:\s*(\d+)/);
    if (mEntry && currentMatchType === "season_challenge") return Number(mEntry[1]);
  }
  return 2;
}

function extractTaskBlock(content, taskId) {
  const re = new RegExp(`taskId:\\s*"${taskId}"[\\s\\S]*?\\n\\s*\\},`, "m");
  const m = content.match(re);
  if (!m) throw new Error(`未找到 taskId ${taskId}（casualMissionTemplates.ts）`);
  return m[0];
}

function applyRuns15RewardVouchers(content, delta) {
  const blockRe = new RegExp(
    `(taskId:\\s*"${RUNS_15_TASK_ID}"[\\s\\S]*?rewardVouchers:\\s*)(\\d+)`,
    "m"
  );
  const next = content.replace(blockRe, (_, p1, n) => `${p1}${Math.max(0, Number(n) + delta)}`);
  if (next === content) throw new Error(`未找到 ${RUNS_15_TASK_ID}.rewardVouchers`);
  return next;
}

function applyMissionVouchersAnchor(content, delta) {
  if (delta === 0) return content;
  const next = content.replace(MISSION_VOUCHERS_ANCHOR_RE, (_, p1, n) => {
    const v = Math.max(0, Math.round((Number(n) + delta) * 10) / 10);
    return `${p1}${v}`;
  });
  if (next === content) throw new Error("未找到 missionVouchersExpect（economy-config-snapshot.ts）");
  return next;
}

function applySeasonChallengeVoucherCost(content, delta) {
  const lines = content.split("\n");
  let currentMatchType = null;
  let changes = 0;
  const out = [];

  for (const line of lines) {
    const mMatch = line.match(/matchType:\s*"([^"]+)"/);
    if (mMatch) currentMatchType = mMatch[1];

    const mEntry = line.match(/^(\s*)entry:\s*\{\s*kind:\s*"seasonVouchers",\s*amount:\s*(\d+)\s*\},?\s*$/);
    if (mEntry && currentMatchType === "season_challenge") {
      const newVal = Math.max(1, Number(mEntry[2]) + delta);
      changes += 1;
      out.push(`${mEntry[1]}entry: { kind: "seasonVouchers", amount: ${newVal} },`);
      continue;
    }
    out.push(line);
  }

  return { content: out.join("\n"), changes };
}

function printHelp() {
  console.log(`
Casual 经济 · 按 tune 建议写券产销（任务 + 专场券耗）

  npm run casual:economy:apply-voucher -- --profile casual
  npm run casual:economy:apply-voucher -- --config ... --write

选项：
  --write / --dry-run     是否写入（默认 dry-run）
  --from <tune.json>      使用已保存 tune --json
  其余参数透传给 economy:tune

写入：
  - casualMissionTemplates.ts       weekly_platform_runs_15 rewardVouchers
  - economy-config-snapshot.ts        missionVouchersExpect（与 runs_15 同步）
  - casualTournamentConfigs.ts        season_challenge 入场 seasonVouchers（若仍缺口）

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
  const plan = planVoucherDelta(tune);

  console.log("Casual 经济 apply-voucher");
  console.log("=".repeat(56));
  console.log(`模式: ${cli.write ? "写入" : "dry-run"}`);
  console.log(`Tune 画像: ${tune.profileKey ?? "?"}`);
  console.log("");

  if (plan.skip) {
    console.log(`跳过券写表: ${plan.reason}`);
    return;
  }

  let missionBefore = readFileSync(PATHS.missionTemplates, "utf8");
  let snapshotBefore = readFileSync(PATHS.snapshot, "utf8");
  let tourBefore = readFileSync(PATHS.tournamentConfigs, "utf8");

  let missionAfter = missionBefore;
  let snapshotAfter = snapshotBefore;
  let tourAfter = tourBefore;
  let tourChanges = 0;

  for (const step of plan.steps) {
    if (step.kind === "note") {
      console.log(`■ 提示: ${step.desc}`);
      continue;
    }
    console.log(`■ ${step.desc}`);
    if (step.kind === "runs_15_reward") {
      missionAfter = applyRuns15RewardVouchers(missionAfter, step.delta);
      snapshotAfter = applyMissionVouchersAnchor(snapshotAfter, step.delta);
    } else if (step.kind === "spotlight_cost") {
      const r = applySeasonChallengeVoucherCost(tourAfter, step.delta);
      tourAfter = r.content;
      tourChanges += r.changes;
    }
  }

  if (tourChanges > 0) {
    console.log(`    casualTournamentConfigs: ${tourChanges} 处 season_challenge 入场券`);
  }
  console.log("");

  if (!cli.write) {
    console.log("以上为计划变更。确认后加 --write 写入。");
    return;
  }

  if (missionBefore !== missionAfter) {
    writeFileSync(PATHS.missionTemplates, missionAfter, "utf8");
    console.log(`已写入 ${PATHS.missionTemplates}`);
  }
  if (snapshotBefore !== snapshotAfter) {
    writeFileSync(PATHS.snapshot, snapshotAfter, "utf8");
    console.log(`已写入 ${PATHS.snapshot}`);
  }
  if (tourBefore !== tourAfter) {
    writeFileSync(PATHS.tournamentConfigs, tourAfter, "utf8");
    console.log(`已写入 ${PATHS.tournamentConfigs}`);
  }

  console.log("\n下一步: npm run casual:economy:sync && npm run casual:economy:balance");
}

main();
