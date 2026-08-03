#!/usr/bin/env node
/**
 * Casual 经济 · 调参建议（根据画像 + 目标锚点反推旋钮）。
 *
 * 用法：
 *   npm run casual:economy:tune -- --profile casual
 *   npm run casual:economy:tune -- --profile casual --pass-season 12 --full-xp-games 8
 *   npm run casual:economy:tune -- --A 4 --B 3 --C 1 --p75 0 --pass-season 12 --full-xp-games 8
 *   npm run casual:economy:tune -- --config scripts/casual/economy-tune.example.json --json
 */

import { readFileSync } from "node:fs";
import {
  CASUAL_F2P_PASS_TARGET_BAND,
  CASUAL_F2P_PASS_TARGET_LEVELS,
  CASUAL_SEASON_NOMINAL_WEEKS,
  DEFAULT_P75,
  DEFAULT_TOURNAMENTS,
  DEFAULT_WEEKLY,
  DEFAULT_XP_DECAY_BY_ORDINAL,
  NET_FLOW_BANDS,
  PASS_XP_PER_LEVEL,
  PROFILES,
  buildDecayForFullXpGames,
  computeWeekly,
  r1,
} from "./economy-balance-core.mjs";

function parseArgs(argv) {
  const out = {
    profileKey: null,
    daily: {},
    spotlightPerWeek: null,
    completesWeeklyMissions: null,
    winRate: null,
    targets: {},
    fullXpGames: null,
    decay: null,
    configPath: null,
    json: false,
    includeShopSink: true,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--no-shop-sink") out.includeShopSink = false;
    else if (a === "--profile") out.profileKey = argv[++i];
    else if (a === "--config") out.configPath = argv[++i];
    else if (a === "--pass-season") out.targets.passSeasonLevels = Number(argv[++i]);
    else if (a === "--pass-min") out.targets.passSeasonMin = Number(argv[++i]);
    else if (a === "--pass-max") out.targets.passSeasonMax = Number(argv[++i]);
    else if (a === "--coins-ideal") out.targets.coinsIdeal = Number(argv[++i]);
    else if (a === "--coins-min") out.targets.coinsMin = Number(argv[++i]);
    else if (a === "--coins-max") out.targets.coinsMax = Number(argv[++i]);
    else if (a === "--gems-ideal") out.targets.gemsIdeal = Number(argv[++i]);
    else if (a === "--gems-min") out.targets.gemsMin = Number(argv[++i]);
    else if (a === "--gems-max") out.targets.gemsMax = Number(argv[++i]);
    else if (a === "--vouchers-ideal") out.targets.vouchersIdeal = Number(argv[++i]);
    else if (a === "--vouchers-min") out.targets.vouchersMin = Number(argv[++i]);
    else if (a === "--vouchers-max") out.targets.vouchersMax = Number(argv[++i]);
    else if (a === "--full-xp-games") out.fullXpGames = Number(argv[++i]);
    else if (a === "--decay") {
      out.decay = argv[++i].split(",").map((x) => Number(x.trim()));
    } else if (a === "--A") out.daily.A = Number(argv[++i]);
    else if (a === "--B") out.daily.B = Number(argv[++i]);
    else if (a === "--C") out.daily.C = Number(argv[++i]);
    else if (a === "--p75") out.daily.p75 = Number(argv[++i]);
    else if (a === "--win-rate") out.winRate = Number(argv[++i]);
    else if (a === "--spotlight") out.spotlightPerWeek = Number(argv[++i]);
    else if (a === "--weekly-mission-rate") out.completesWeeklyMissions = Number(argv[++i]);
    else if (a === "--no-sign-in") out.daily.signIn = false;
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

function mergeConfig(cli, fileCfg) {
  if (!fileCfg) return cli;
  const merged = { ...cli };
  if (fileCfg.profileKey) merged.profileKey = fileCfg.profileKey;
  if (fileCfg.profile) {
    if (fileCfg.profile.daily) merged.daily = { ...merged.daily, ...fileCfg.profile.daily };
    if (fileCfg.profile.spotlightPerWeek != null) merged.spotlightPerWeek = fileCfg.profile.spotlightPerWeek;
    if (fileCfg.profile.completesWeeklyMissions != null) {
      merged.completesWeeklyMissions = fileCfg.profile.completesWeeklyMissions;
    }
    if (fileCfg.profile.label) merged.label = fileCfg.profile.label;
  }
  if (fileCfg.targets) merged.targets = { ...fileCfg.targets, ...merged.targets };
  if (fileCfg.fullXpGames != null) merged.fullXpGames = fileCfg.fullXpGames;
  if (fileCfg.decay) merged.decay = fileCfg.decay;
  if (fileCfg.includeShopSink != null) merged.includeShopSink = fileCfg.includeShopSink;
  return merged;
}

function resolveProfile(cli) {
  const base = cli.profileKey && PROFILES[cli.profileKey] ? { ...PROFILES[cli.profileKey] } : {
    label: cli.label ?? "自定义画像",
    daily: { A: 0, B: 0, C: 0, p75: 0, signIn: true, winRate: 0.45 },
    spotlightPerWeek: 1,
    completesWeeklyMissions: 0.7,
  };

  if (Object.keys(cli.daily).length > 0) {
    base.daily = { ...base.daily, ...cli.daily };
  }
  if (cli.winRate != null) base.daily.winRate = cli.winRate;
  if (base.daily.signIn === undefined) base.daily.signIn = true;
  if (cli.spotlightPerWeek != null) base.spotlightPerWeek = cli.spotlightPerWeek;
  if (cli.completesWeeklyMissions != null) base.completesWeeklyMissions = cli.completesWeeklyMissions;

  return base;
}

function defaultTargets(profileKey, overrides) {
  const t = {
    passSeasonLevels: CASUAL_F2P_PASS_TARGET_LEVELS,
    passSeasonMin: CASUAL_F2P_PASS_TARGET_BAND.min,
    passSeasonMax: CASUAL_F2P_PASS_TARGET_BAND.max,
    coinsMin: NET_FLOW_BANDS.coins.min,
    coinsMax: NET_FLOW_BANDS.coins.max,
    coinsIdeal: profileKey === "casual" ? 62 : null,
    gemsMin: NET_FLOW_BANDS.gems.min,
    gemsMax: NET_FLOW_BANDS.gems.max,
    gemsIdeal: profileKey === "casual" ? -3.6 : null,
    vouchersMin: NET_FLOW_BANDS.vouchers.min,
    vouchersMax: NET_FLOW_BANDS.vouchers.max,
    vouchersIdeal: profileKey === "casual" ? 2.3 : null,
  };
  return { ...t, ...overrides };
}

function r2(n) {
  return Math.round(n * 100) / 100;
}

function roundPassXp(n) {
  return Math.max(0, Math.round(n));
}

function suggestPassXpScale(week, targets, tournaments, p75Cfg) {
  const passSeasonLevels = targets.passSeasonLevels;
  const targetWeeklyPassXp = (passSeasonLevels * PASS_XP_PER_LEVEL) / CASUAL_SEASON_NOMINAL_WEEKS;
  const fixedWeeklyPassXp =
    week.passXpFromDailyPerWeek + week.weeklyMissionPassXp;
  const targetGameWeeklyPassXp = targetWeeklyPassXp - fixedWeeklyPassXp;
  const currentGameWeeklyPassXp = week.passXpFromGamesPerWeek;

  if (currentGameWeeklyPassXp <= 0) {
    return {
      scale: null,
      targetWeeklyPassXp,
      fixedWeeklyPassXp,
      targetGameWeeklyPassXp,
      currentGameWeeklyPassXp,
      error: "对局 Pass XP 为 0，请提高日局数或检查画像",
    };
  }

  const scale = targetGameWeeklyPassXp / currentGameWeeklyPassXp;

  const suggestions = [];
  for (const key of ["A", "B", "C"]) {
    const cur = tournaments[key].passXp;
    suggestions.push({
      knob: `seasonXpOnSettle.${key}`,
      file: "casualTournamentConfigs.ts",
      mirror: `economy-balance.mjs TOURNAMENTS.${key}.passXp`,
      current: cur,
      suggested: roundPassXp(cur * scale),
      scale: r2(scale),
    });
  }
  suggestions.push({
    knob: "seasonXpOnSettle.p75",
    file: "casualTournamentConfigs.ts",
    mirror: "economy-balance.mjs P75.passXp",
    current: p75Cfg.passXp,
    suggested: roundPassXp(p75Cfg.passXp * scale),
    scale: r2(scale),
  });

  return {
    scale: r2(scale),
    targetWeeklyPassXp: r1(targetWeeklyPassXp),
    fixedWeeklyPassXp: r1(fixedWeeklyPassXp),
    targetGameWeeklyPassXp: r1(targetGameWeeklyPassXp),
    currentGameWeeklyPassXp: r1(currentGameWeeklyPassXp),
    suggestions,
  };
}

function suggestCoinAdjustment(week, targets, profile) {
  const ideal =
    targets.coinsIdeal ??
    (targets.coinsMin + targets.coinsMax) / 2;
  const gap = ideal - week.netCoins;
  const d = profile.daily;
  const weeklyAsyncGames = {
    A: (d.A ?? 0) * 7,
    B: (d.B ?? 0) * 7,
    C: (d.C ?? 0) * 7,
  };
  const totalAsync = weeklyAsyncGames.A + weeklyAsyncGames.B + weeklyAsyncGames.C;

  const options = [];
  if (Math.abs(gap) < 5) {
    options.push({ action: "保持", detail: "金币净流已接近目标，无需调整" });
  } else if (gap > 0) {
    if (weeklyAsyncGames.A > 0) {
      options.push({
        action: "抬 A 底奖",
        knob: "baseCoins A (+ expectScoreTierCoins)",
        file: "casualTournamentConfigs.ts",
        deltaPerGame: r1(gap / weeklyAsyncGames.A),
        example: `A baseCoins +${Math.ceil(gap / weeklyAsyncGames.A)}（约周净 +${r1(gap)}）`,
      });
    }
    if (weeklyAsyncGames.B > 0) {
      options.push({
        action: "抬 B 底奖",
        knob: "baseCoins B",
        file: "casualTournamentConfigs.ts",
        deltaPerGame: r1(gap / weeklyAsyncGames.B),
        example: `B baseCoins +${Math.ceil(gap / weeklyAsyncGames.B)}（约周净 +${r1(gap)}）`,
      });
    }
    options.push({
      action: "降入场费",
      knob: "entryCoins A/B",
      file: "casualTournamentConfigs.ts",
      detail: `周净需 +${r1(gap)}；可组合降低 A/B 入场（当前周入场 ${r1(week.entryCoins)}）`,
    });
  } else {
    const need = -gap;
    if (totalAsync > 0) {
      options.push({
        action: "抬入场费",
        knob: "entryCoins A/B",
        file: "casualTournamentConfigs.ts",
        detail: `周净需 -${r1(need)}；或降底奖约 ${r1(need / totalAsync)}/局（async 合计 ${totalAsync} 局/周）`,
      });
    }
    options.push({
      action: "加商店 sink",
      knob: "ECONOMY_SHOP_SINK_BY_PROFILE / casualShopCatalog",
      file: "casualSeasonEconomyConstants.ts",
      detail: `discretionary 金耗 +${Math.ceil(need)} / 周（当前商店 sink ${r1(week.shopSinkCoins)}）`,
    });
  }

  return { ideal: r1(ideal), current: r1(week.netCoins), gap: r1(gap), options };
}

function suggestGemAdjustment(week, targets) {
  const ideal =
    targets.gemsIdeal ??
    (targets.gemsMin + targets.gemsMax) / 2;
  const gap = ideal - week.netGems;
  const options = [];
  if (Math.abs(gap) < 2) {
    options.push({ action: "保持", detail: "钻净流已接近目标" });
  } else if (gap > 0) {
    options.push({
      action: "抬 C/B 钻产出",
      knob: "baseGems C / baseGems B",
      file: "casualTournamentConfigs.ts",
      detail: `周净需 +${r1(gap)}（当前产 ${r1(week.gems)} 耗 ${r1(week.entryGems + week.shopSinkGems)}）`,
    });
  } else {
    options.push({
      action: "抬 C 入场钻或降产出",
      knob: "entryGems C / baseGems",
      file: "casualTournamentConfigs.ts",
      detail: `周净需 -${r1(-gap)}`,
    });
  }
  return { ideal: r1(ideal), current: r1(week.netGems), gap: r1(gap), options };
}

function suggestVoucherAdjustment(week, targets, profile) {
  const ideal =
    targets.vouchersIdeal ??
    (targets.vouchersMin + targets.vouchersMax) / 2;
  const gap = ideal - week.netVouchers;
  const options = [];
  if (Math.abs(gap) < 0.5) {
    options.push({ action: "保持", detail: "券净流已接近目标" });
  } else if (gap > 0) {
    options.push({
      action: "加券任务产出",
      knob: "casualMissionTemplates runs_15 / league_promote",
      file: "casualMissionTemplates.ts",
      detail: `周净需 +${r1(gap)}`,
    });
  } else {
    options.push({
      action: "减专场或抬专场券耗",
      knob: "spotlightPerWeek / SEASON_CHALLENGE_VOUCHER_COST",
      file: "economy-tune profile + casualTournamentConfigs",
      detail: `当前专场 ${profile.spotlightPerWeek}/周 × 2 券；可降至 ${Math.max(0, profile.spotlightPerWeek - 1)} 或减任务券`,
    });
  }
  return { ideal: r1(ideal), current: r1(week.netVouchers), gap: r1(gap), options };
}

function decayRecommendation(fullXpGames, decayOverride) {
  const decay = decayOverride ?? (fullXpGames != null ? buildDecayForFullXpGames(fullXpGames) : null);
  if (!decay) return null;

  return {
    XP_DECAY_BY_ORDINAL: decay,
    DAILY_GROWTH_FULL_XP_GAMES: fullXpGames ?? decay.filter((x) => x >= 1).length,
    files: [
      "casualPayoutPolicy.ts",
      "casualPayoutDailyService.ts (DAILY_GROWTH_FULL_XP_GAMES)",
      "economy-balance.mjs / economy-balance-core.mjs",
    ],
    note:
      fullXpGames != null
        ? `前 ${fullXpGames} 场满额；数组末尾需为 0 才能让第 ${fullXpGames + 1} 场起 Pass/League XP 为 0`
        : "自定义 decay 表",
  };
}

function healthStatus(value, min, max) {
  if (value < min) return "low";
  if (value > max) return "high";
  return "ok";
}

function printHelp() {
  console.log(`
Casual 经济调参建议 · economy-tune.mjs

必选其一：--profile casual|active|grinder  或  --A/--B/--C 自定义日局数

目标锚点（可选，默认 casual 用设计文档健康带）：
  --pass-season 12        一季 Pass 等级锚点
  --pass-min / --pass-max Pass 允许带
  --coins-ideal 62        周金币净流目标（或用 --coins-min/--coins-max）
  --gems-ideal / --vouchers-ideal

衰减 / 满额场：
  --full-xp-games 8       生成 [1×8,0] 衰减表建议
  --decay "1,1,1,0"       自定义衰减（逗号分隔）

画像细项：
  --p75 1 --win-rate 0.45 --spotlight 1 --weekly-mission-rate 0.7 --no-sign-in

其它：
  --config path.json      与 CLI 合并（JSON 见 economy-tune.example.json）
  --no-shop-sink          金币目标按入场水槽
  --json                  结构化输出

示例：
  npm run casual:economy:tune -- --profile casual --full-xp-games 8 --pass-season 12
  npm run casual:economy:tune -- --A 4 --B 3 --C 1 --p75 0 --full-xp-games 8
`);
}

function main() {
  const cli = parseArgs(process.argv.slice(2));
  if (cli.help) {
    printHelp();
    return;
  }

  let fileCfg = null;
  if (cli.configPath) {
    fileCfg = JSON.parse(readFileSync(cli.configPath, "utf8"));
  }
  const merged = mergeConfig(cli, fileCfg);
  const profileKey = merged.profileKey ?? "custom";
  const profile = resolveProfile(merged);
  const targets = defaultTargets(profileKey === "custom" ? "casual" : profileKey, merged.targets);

  const xpDecay =
    merged.decay ??
    (merged.fullXpGames != null ? buildDecayForFullXpGames(merged.fullXpGames) : DEFAULT_XP_DECAY_BY_ORDINAL);

  const week = computeWeekly(profile, profileKey, {
    xpDecay,
    useDecay: true,
    includeShopSink: merged.includeShopSink,
    tournaments: DEFAULT_TOURNAMENTS,
    p75: DEFAULT_P75,
    weekly: DEFAULT_WEEKLY,
  });

  const passLevelsPerSeason =
    (week.passXp / PASS_XP_PER_LEVEL) * CASUAL_SEASON_NOMINAL_WEEKS;

  const passPlan = suggestPassXpScale(week, targets, DEFAULT_TOURNAMENTS, DEFAULT_P75);
  const coinPlan = suggestCoinAdjustment(week, targets, profile);
  const gemPlan = suggestGemAdjustment(week, targets);
  const voucherPlan = suggestVoucherAdjustment(week, targets, profile);
  const decayPlan = decayRecommendation(merged.fullXpGames, merged.decay ? xpDecay : null);

  const result = {
    profileKey,
    profile: {
      label: profile.label,
      daily: profile.daily,
      spotlightPerWeek: profile.spotlightPerWeek,
      completesWeeklyMissions: profile.completesWeeklyMissions,
      asyncGamesPerDay:
        (profile.daily.A ?? 0) + (profile.daily.B ?? 0) + (profile.daily.C ?? 0),
    },
    targets,
    current: {
      passLevelsPerSeason: r1(passLevelsPerSeason),
      passLevelsPerWeek: r1(week.passXp / PASS_XP_PER_LEVEL),
      netCoins: r1(week.netCoins),
      netGems: r1(week.netGems),
      netVouchers: r1(week.netVouchers),
      xpDecayUsed: xpDecay,
    },
    gaps: {
      passSeason: r1(passLevelsPerSeason - targets.passSeasonLevels),
      coins: r1(week.netCoins - (targets.coinsIdeal ?? (targets.coinsMin + targets.coinsMax) / 2)),
      gems: r1(week.netGems - (targets.gemsIdeal ?? (targets.gemsMin + targets.gemsMax) / 2)),
      vouchers: r1(
        week.netVouchers -
          (targets.vouchersIdeal ?? (targets.vouchersMin + targets.vouchersMax) / 2)
      ),
    },
    health: {
      pass: healthStatus(passLevelsPerSeason, targets.passSeasonMin, targets.passSeasonMax),
      coins: healthStatus(week.netCoins, targets.coinsMin, targets.coinsMax),
      gems: healthStatus(week.netGems, targets.gemsMin, targets.gemsMax),
      vouchers: healthStatus(week.netVouchers, targets.vouchersMin, targets.vouchersMax),
    },
    recommendations: {
      order: [
        "1. 画像 PROFILES / 日 mix",
        "2. XP 衰减 + DAILY_GROWTH_FULL_XP_GAMES",
        "3. seasonXpOnSettle（Pass）",
        "4. 入场/底奖/商店（币钻券净流）",
        "5. npm run casual:economy:balance 验收",
      ],
      decay: decayPlan,
      passXp: passPlan,
      coins: coinPlan,
      gems: gemPlan,
      vouchers: voucherPlan,
      filesToSync: [
        "src/convex/casualPlatform/convex/data/*.ts（改配表）",
        "npm run casual:economy:sync → economy-balance-data.mjs",
        "scripts/casual/economy-balance-core.mjs（PROFILES 画像）",
      ],
    },
  };

  if (merged.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log("\nCasual 经济调参建议");
  console.log("=".repeat(64));
  console.log(`画像: ${profileKey} — ${profile.label}`);
  console.log(
    `日局 async: A${profile.daily.A ?? 0} B${profile.daily.B ?? 0} C${profile.daily.C ?? 0} p75${profile.daily.p75 ?? 0} · 胜率${profile.daily.winRate}`
  );
  console.log(`衰减表: [${xpDecay.join(", ")}] · 商店sink: ${merged.includeShopSink ? "计入" : "不计"}`);

  console.log("\n■ 当前 vs 目标");
  console.log(
    `  Pass 一季: ${r1(passLevelsPerSeason)} → 锚点 ${targets.passSeasonLevels}（带 ${targets.passSeasonMin}–${targets.passSeasonMax}） [${result.health.pass}]`
  );
  console.log(
    `  coins 周净: ${r1(week.netCoins)} → 理想 ${coinPlan.ideal}（带 ${targets.coinsMin}–${targets.coinsMax}） [${result.health.coins}]`
  );
  console.log(
    `  gems  周净: ${r1(week.netGems)} → 理想 ${gemPlan.ideal}（带 ${targets.gemsMin}–${targets.gemsMax}） [${result.health.gems}]`
  );
  console.log(
    `  券    周净: ${r1(week.netVouchers)} → 理想 ${voucherPlan.ideal}（带 ${targets.vouchersMin}–${targets.vouchersMax}） [${result.health.vouchers}]`
  );

  if (decayPlan) {
    console.log("\n■ 建议 1 — XP 衰减 / 满额场");
    console.log(`  XP_DECAY_BY_ORDINAL = [${decayPlan.XP_DECAY_BY_ORDINAL.join(", ")}]`);
    console.log(`  DAILY_GROWTH_FULL_XP_GAMES = ${decayPlan.DAILY_GROWTH_FULL_XP_GAMES}`);
    console.log(`  ${decayPlan.note}`);
  }

  if (passPlan.scale != null) {
    console.log("\n■ 建议 2 — seasonXpOnSettle（仅对局 Pass，任务不动）");
    console.log(
      `  对局 Pass 缩放系数 ≈ ${passPlan.scale}（固定任务 ${passPlan.fixedWeeklyPassXp}/周，对局目标 ${passPlan.targetGameWeeklyPassXp}/周）`
    );
    for (const s of passPlan.suggestions) {
      console.log(`  ${s.knob}: ${s.current} → ${s.suggested}  (${s.file})`);
    }
  } else if (passPlan.error) {
    console.log("\n■ Pass: " + passPlan.error);
  }

  console.log("\n■ 建议 3 — 金币净流");
  console.log(`  缺口: ${coinPlan.gap}（当前 ${coinPlan.current}，目标 ${coinPlan.ideal}）`);
  for (const o of coinPlan.options) {
    console.log(`  · ${o.action}: ${o.example ?? o.detail ?? o.knob}`);
  }

  console.log("\n■ 建议 4 — 钻 / 券");
  for (const o of gemPlan.options) {
    console.log(`  钻 · ${o.action}: ${o.detail ?? o.example}`);
  }
  for (const o of voucherPlan.options) {
    console.log(`  券 · ${o.action}: ${o.detail ?? o.example}`);
  }

  console.log("\n■ 调参顺序");
  for (const step of result.recommendations.order) {
    console.log(`  ${step}`);
  }
  console.log("\n验收: npm run casual:economy:balance");
}

main();
