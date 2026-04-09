/**
 * Ensures tacticalMonster frontend shims remain thin re-exports of convex/data (no duplicate bodies).
 * Run: node scripts/verify-tactical-monster-config-shims.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const shims = [
    "src/component/battle/games/tacticalMonster/config/stageRuleConfigs.ts",
    "src/component/battle/games/tacticalMonster/config/pedagogyByRuleId.ts",
    "src/component/battle/games/tacticalMonster/types/stageRuleTypes.ts",
];

let failed = false;

for (const rel of shims) {
    const abs = path.join(root, rel);
    const text = fs.readFileSync(abs, "utf8");

    if (!text.includes('@/convex/tacticalMonster/convex/')) {
        console.error(`[verify-shims] Missing convex re-export path in ${rel}`);
        failed = true;
    }
    if (/STAGE_RULE_CONFIGS\s*:\s*\{/.test(text)) {
        console.error(`[verify-shims] ${rel} must not define STAGE_RULE_CONFIGS object; edit convex/data/stageRuleConfigs.ts`);
        failed = true;
    }
    if (/PEDAGOGY_BY_RULE_ID\s*:\s*\{/.test(text)) {
        console.error(`[verify-shims] ${rel} must not define PEDAGOGY_BY_RULE_ID object; edit convex/data/pedagogyByRuleId.ts`);
        failed = true;
    }
    if (/export\s+interface\s+StageRuleConfig\b/.test(text)) {
        console.error(`[verify-shims] ${rel} must not redefine StageRuleConfig; edit convex/types/stageRuleTypes.ts`);
        failed = true;
    }
    const lines = text.split(/\r?\n/).length;
    if (lines > 30) {
        console.error(`[verify-shims] ${rel} has ${lines} lines; keep shims under ~30 lines or update this script`);
        failed = true;
    }
}

if (failed) {
    process.exit(1);
}
console.log("[verify-shims] OK:", shims.length, "files");
