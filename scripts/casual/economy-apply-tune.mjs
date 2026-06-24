#!/usr/bin/env node
/**
 * 根据 economy:tune 建议自动改配表（衰减 / 满额场 / seasonXpOnSettle / 可选 PROFILES）。
 *
 * 默认 dry-run，仅打印将改什么；加 --write 才写入文件。
 *
 * 用法：
 *   npm run casual:economy:apply-tune -- --config scripts/casual/economy-tune.example.json
 *   npm run casual:economy:apply-tune -- --config scripts/casual/economy-tune.example.json --write
 *   npm run casual:economy:apply-tune -- --from tune-output.json --write
 *   npm run casual:economy:apply-tune -- --A 4 --B 3 --C 1 --full-xp-games 8 --pass-season 12 --write --apply-profile casual
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");

const PATHS = {
  payoutPolicy: join(
    REPO_ROOT,
    "src/convex/casualPlatform/convex/data/casualPayoutPolicy.ts"
  ),
  payoutDailyService: join(
    REPO_ROOT,
    "src/convex/casualPlatform/convex/service/payout/casualPayoutDailyService.ts"
  ),
  tournamentConfigs: join(
    REPO_ROOT,
    "src/convex/casualPlatform/convex/data/casualTournamentConfigs.ts"
  ),
  balanceCore: join(__dirname, "economy-balance-core.mjs"),
};

const PASS_XP_MATCH_TYPES = {
  A: ["tournament_a", "triathlon_a"],
  B: ["tournament_b", "triathlon_b"],
  C: ["tournament_c", "triathlon_c"],
  p75: ["solo_p75_challenge"],
};

function parseArgs(argv) {
  const forward = [];
  const out = {
    write: false,
    fromPath: null,
    applyProfileKey: null,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--write") out.write = true;
    else if (a === "--dry-run") out.write = false;
    else if (a === "--from") out.fromPath = argv[++i];
    else if (a === "--apply-profile") out.applyProfileKey = argv[++i];
    else if (a === "--help" || a === "-h") out.help = true;
    else forward.push(a);
  }
  out.forwardArgs = forward;
  return out;
}

function runTuneJson(forwardArgs) {
  const tuneScript = join(__dirname, "economy-tune.mjs");
  const json = execFileSync(process.execPath, [tuneScript, ...forwardArgs, "--json"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(json);
}

function loadTuneResult(cli) {
  if (cli.fromPath) {
    return JSON.parse(readFileSync(cli.fromPath, "utf8"));
  }
  return runTuneJson(cli.forwardArgs);
}

function buildPassXpByMatchType(suggestions) {
  const byTier = {};
  for (const s of suggestions) {
    if (s.knob === "seasonXpOnSettle.A") byTier.A = s.suggested;
    if (s.knob === "seasonXpOnSettle.B") byTier.B = s.suggested;
    if (s.knob === "seasonXpOnSettle.C") byTier.C = s.suggested;
    if (s.knob === "seasonXpOnSettle.p75") byTier.p75 = s.suggested;
  }
  const map = {};
  for (const [tier, types] of Object.entries(PASS_XP_MATCH_TYPES)) {
    if (byTier[tier] == null) continue;
    for (const mt of types) map[mt] = byTier[tier];
  }
  return map;
}

const XP_DECAY_RE = /export const XP_DECAY_BY_ORDINAL: readonly number\[\] = \[[^\]]*\];/;
const FULL_XP_GAMES_RE = /export const DAILY_GROWTH_FULL_XP_GAMES = \d+;/;

function applyXpDecay(content, decay) {
  const arr = `[${decay.join(", ")}]`;
  const replacement = `export const XP_DECAY_BY_ORDINAL: readonly number[] = ${arr};`;
  if (!XP_DECAY_RE.test(content)) {
    throw new Error("未找到 XP_DECAY_BY_ORDINAL 行（casualPayoutPolicy.ts）");
  }
  if (content.includes(replacement)) return content;
  return content.replace(XP_DECAY_RE, replacement);
}

function applyFullXpGames(content, n) {
  const replacement = `export const DAILY_GROWTH_FULL_XP_GAMES = ${n};`;
  if (!FULL_XP_GAMES_RE.test(content)) {
    throw new Error("未找到 DAILY_GROWTH_FULL_XP_GAMES（casualPayoutDailyService.ts）");
  }
  if (content.includes(replacement)) return content;
  return content.replace(FULL_XP_GAMES_RE, replacement);
}

function applySeasonXpByMatchType(content, xpByMatchType) {
  const lines = content.split("\n");
  let currentMatchType = null;
  let changes = 0;
  const out = [];

  for (const line of lines) {
    const mMatch = line.match(/matchType:\s*"([^"]+)"/);
    if (mMatch) currentMatchType = mMatch[1];

    const mXp = line.match(/^(\s*)seasonXpOnSettle:\s*(\d+),?\s*$/);
    if (mXp && currentMatchType && xpByMatchType[currentMatchType] != null) {
      const newVal = xpByMatchType[currentMatchType];
      if (Number(mXp[2]) !== newVal) changes += 1;
      out.push(`${mXp[1]}seasonXpOnSettle: ${newVal},`);
      continue;
    }
    out.push(line);
  }

  return { content: out.join("\n"), changes };
}

function formatDailyObject(daily) {
  const parts = [];
  if (daily.A != null) parts.push(`A: ${daily.A}`);
  if (daily.B != null) parts.push(`B: ${daily.B}`);
  if (daily.C != null) parts.push(`C: ${daily.C}`);
  parts.push(`p75: ${daily.p75 ?? 0}`);
  parts.push(`signIn: ${daily.signIn !== false}`);
  parts.push(`winRate: ${daily.winRate ?? 0.45}`);
  return `{ ${parts.join(", ")} }`;
}

function applyCasualProfile(coreContent, profileKey, profilePatch) {
  const key = profileKey === "custom" ? "casual" : profileKey;
  const blockRe = new RegExp(
    `(${key}:\\s*\\{[\\s\\n]*label:\\s*"[^"]*",\\s*\\n\\s*)daily:\\s*\\{[^}]*\\}`,
    "m"
  );
  const daily = profilePatch.daily ?? {};
  const replacement = `$1daily: ${formatDailyObject(daily)}`;
  const next = coreContent.replace(blockRe, replacement);
  if (next === coreContent && coreContent.includes(`daily: ${formatDailyObject(daily)}`)) {
    return coreContent;
  }
  if (next === coreContent) {
    throw new Error(`未找到 PROFILES.${key}.daily（economy-balance-core.mjs）`);
  }

  let next2 = next;
  if (profilePatch.label) {
    const labelRe = new RegExp(`(${key}:\\s*\\{\\s*\\n\\s*)label:\\s*"[^"]*"`);
    next2 = next2.replace(labelRe, `$1label: "${profilePatch.label}"`);
  }
  if (profilePatch.spotlightPerWeek != null) {
    next2 = next2.replace(
      new RegExp(`(${key}:[\\s\\n][\\s\\n]*daily:[\\s\\n][^}]*\\},\\s*\\n\\s*)spotlightPerWeek:\\s*[\\d.]+`),
      `$1spotlightPerWeek: ${profilePatch.spotlightPerWeek}`
    );
  }
  if (profilePatch.completesWeeklyMissions != null) {
    next2 = next2.replace(
      new RegExp(
        `(${key}:[\\s\\n][\\s\\n]*spotlightPerWeek:[\\s\\n][\\d.]+,\\s*\\n\\s*)completesWeeklyMissions:\\s*[\\d.]+`
      ),
      `$1completesWeeklyMissions: ${profilePatch.completesWeeklyMissions}`
    );
  }
  return next2;
}

function loadConfigProfile(forwardArgs) {
  const idx = forwardArgs.indexOf("--config");
  if (idx < 0) return null;
  const path = forwardArgs[idx + 1];
  if (!path) return null;
  const cfg = JSON.parse(readFileSync(path, "utf8"));
  return cfg.profile ?? null;
}

function printHelp() {
  console.log(`
Casual 经济 · 按 tune 建议自动改配表

  npm run casual:economy:apply-tune -- --config scripts/casual/economy-tune.example.json
  npm run casual:economy:apply-tune -- --config ... --write
  npm run casual:economy:apply-tune -- --from tune-output.json --write

选项（与 economy:tune 相同参数可透传）：
  --write          写入文件（默认仅 dry-run）
  --from <json>    使用已保存的 tune --json 结果，不再重跑 tune
  --apply-profile casual   将 --config 内 profile 写入 PROFILES.casual

自动写入（不含金币/钻/券，那些 tune 只给方向）：
  - casualPayoutPolicy.ts          XP_DECAY_BY_ORDINAL
  - casualPayoutDailyService.ts    DAILY_GROWTH_FULL_XP_GAMES
  - casualTournamentConfigs.ts     seasonXpOnSettle（按 matchType / triathlon）
  - economy-balance-core.mjs       可选 PROFILES（--apply-profile）

写入后请执行：
  npm run casual:economy:sync
  npm run casual:economy:balance
`);
}

function main() {
  const cli = parseArgs(process.argv.slice(2));
  if (cli.help) {
    printHelp();
    return;
  }

  const tune = loadTuneResult(cli);
  const decayPlan = tune.recommendations?.decay;
  const passPlan = tune.recommendations?.passXp;

  if (!passPlan?.suggestions?.length) {
    console.error("tune 结果无 Pass 建议，无法 apply");
    process.exit(1);
  }

  const xpByMatchType = buildPassXpByMatchType(passPlan.suggestions);
  const planned = [];

  if (decayPlan?.XP_DECAY_BY_ORDINAL) {
    planned.push({
      file: PATHS.payoutPolicy,
      desc: `XP_DECAY_BY_ORDINAL = [${decayPlan.XP_DECAY_BY_ORDINAL.join(", ")}]`,
      apply: (c) => applyXpDecay(c, decayPlan.XP_DECAY_BY_ORDINAL),
    });
    if (decayPlan.DAILY_GROWTH_FULL_XP_GAMES != null) {
      planned.push({
        file: PATHS.payoutDailyService,
        desc: `DAILY_GROWTH_FULL_XP_GAMES = ${decayPlan.DAILY_GROWTH_FULL_XP_GAMES}`,
        apply: (c) => applyFullXpGames(c, decayPlan.DAILY_GROWTH_FULL_XP_GAMES),
      });
    }
  }

  planned.push({
    file: PATHS.tournamentConfigs,
    desc: `seasonXpOnSettle 按 matchType: ${JSON.stringify(xpByMatchType)}`,
    apply: (c) => {
      const r = applySeasonXpByMatchType(c, xpByMatchType);
      return r.content;
    },
    countKey: "seasonXp",
  });

  const configProfile = loadConfigProfile(cli.forwardArgs);
  if (cli.applyProfileKey && configProfile) {
    planned.push({
      file: PATHS.balanceCore,
      desc: `PROFILES.${cli.applyProfileKey} ← config profile`,
      apply: (c) => applyCasualProfile(c, cli.applyProfileKey, configProfile),
    });
  }

  console.log("Casual 经济 apply-tune");
  console.log("=".repeat(56));
  console.log(`模式: ${cli.write ? "写入" : "dry-run（加 --write 才改文件）"}`);
  console.log(`Tune 画像: ${tune.profileKey ?? "?"}`);
  if (passPlan.scale != null) {
    console.log(`Pass 对局缩放系数 ≈ ${passPlan.scale}`);
  }
  console.log("");

  const writes = [];
  for (const p of planned) {
    const before = readFileSync(p.file, "utf8");
    let after;
    if (p.file === PATHS.tournamentConfigs) {
      const r = applySeasonXpByMatchType(before, xpByMatchType);
      after = r.content;
      console.log(`■ ${p.desc}`);
      console.log(`    文件: ${p.file}`);
      console.log(`    将改 ${r.changes} 处 seasonXpOnSettle`);
    } else {
      after = p.apply(before);
      console.log(`■ ${p.desc}`);
      console.log(`    文件: ${p.file}`);
    }
    if (before !== after) writes.push({ file: p.file, before, after });
    else console.log("    （内容无变化，跳过）");
    console.log("");
  }

  if (!writes.length) {
    console.log("无文件需要更新。");
    return;
  }

  if (!cli.write) {
    console.log("以上为计划变更。确认后加 --write 写入。");
    return;
  }

  for (const w of writes) {
    writeFileSync(w.file, w.after, "utf8");
    console.log(`已写入 ${w.file}`);
  }

  console.log("\n下一步:");
  console.log("  npm run casual:economy:sync");
  console.log("  npm run casual:economy:balance");
  console.log("\n未自动修改: 任务 Pass XP、商店 SKU（钻/券见 apply-gem / apply-voucher）");
}

main();
