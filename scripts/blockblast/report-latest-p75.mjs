#!/usr/bin/env node
/**
 * 打印最新（或指定）Block Blast 池的 scoreP75 分布。
 *
 *   npx tsx scripts/blockblast/report-latest-p75.mjs
 *   npx tsx scripts/blockblast/report-latest-p75.mjs --out scripts/blockblast/output/pool-calib-str-A
 *   npm run blockblast:pool:p75
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputRoot = path.join(__dirname, "output");

function parseArgs(argv) {
  let out = "";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") out = path.resolve(argv[++i] ?? "");
  }
  return { out };
}

function mid(a) {
  return a.length ? a[Math.floor(a.length / 2)] : null;
}

function q(a, p) {
  if (!a.length) return null;
  return a[Math.min(a.length - 1, Math.floor(p * (a.length - 1)))];
}

function listPoolDirs() {
  if (!existsSync(outputRoot)) return [];
  return readdirSync(outputRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const dir = path.join(outputRoot, d.name);
      const indexPath = path.join(dir, "index.json");
      const st = existsSync(indexPath) ? statSync(indexPath) : statSync(dir);
      return { name: d.name, dir, mtime: st.mtimeMs, mtimeIso: st.mtime.toISOString() };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

function loadScale(dir) {
  for (const f of ["l1-iter-meta.json", "l1-iter-summary.json"]) {
    const p = path.join(dir, f);
    if (!existsSync(p)) continue;
    try {
      const j = JSON.parse(readFileSync(p, "utf8"));
      if (j.thinkTimeScale != null) return j.thinkTimeScale;
    } catch {
      // ignore
    }
  }
  return null;
}

function reportDir(dir, name, mtimeIso) {
  const indexPath = path.join(dir, "index.json");
  if (!existsSync(indexPath)) {
    console.log(`${name}: no index.json`);
    return;
  }
  const index = JSON.parse(readFileSync(indexPath, "utf8"));
  const entries = Array.isArray(index.entries) ? index.entries : [];
  const scale = loadScale(dir);

  if (entries.length === 0) {
    let rejected = [];
    const rejPath = path.join(dir, "rejected.json");
    if (existsSync(rejPath)) {
      try {
        rejected = JSON.parse(readFileSync(rejPath, "utf8")) || [];
      } catch {
        rejected = [];
      }
    }
    const p75 = rejected
      .map((e) => e.metrics?.scoreQuantiles?.p75)
      .filter((n) => typeof n === "number")
      .sort((a, b) => a - b);
    console.log(
      JSON.stringify(
        {
          pool: name,
          updated: mtimeIso,
          entries: 0,
          rejected: rejected.length,
          thinkTimeScale: scale,
          p75_from_rejected: {
            n: p75.length,
            min: p75[0] ?? null,
            med: mid(p75),
            max: p75[p75.length - 1] ?? null,
          },
        },
        null,
        2
      )
    );
    return;
  }

  const p75 = entries
    .map((e) => e.metrics?.scoreQuantiles?.p75)
    .filter((n) => typeof n === "number")
    .sort((a, b) => a - b);
  const p90 = entries
    .map((e) => e.metrics?.scoreP90)
    .filter((n) => typeof n === "number")
    .sort((a, b) => a - b);
  const stuck = entries
    .map((e) => e.metrics?.stuckRate)
    .filter((n) => typeof n === "number")
    .sort((a, b) => a - b);

  console.log(
    JSON.stringify(
      {
        pool: name,
        updated: mtimeIso,
        entries: entries.length,
        poolVersion: index.poolVersion,
        thinkTimeScale: scale,
        p75: {
          min: p75[0] ?? null,
          p25: q(p75, 0.25),
          med: mid(p75),
          p75: q(p75, 0.75),
          max: p75[p75.length - 1] ?? null,
        },
        p90_med: mid(p90),
        stuck_med: mid(stuck),
      },
      null,
      2
    )
  );
}

const opts = parseArgs(process.argv.slice(2));
if (opts.out) {
  const name = path.basename(opts.out);
  const st = existsSync(path.join(opts.out, "index.json"))
    ? statSync(path.join(opts.out, "index.json"))
    : statSync(opts.out);
  reportDir(opts.out, name, st.mtime.toISOString());
} else {
  const dirs = listPoolDirs();
  if (dirs.length === 0) {
    console.error(`no pools under ${outputRoot}`);
    process.exit(1);
  }
  const latest = dirs[0];
  reportDir(latest.dir, latest.name, latest.mtimeIso);
}
