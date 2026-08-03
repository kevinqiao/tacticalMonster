import path from "node:path";
import { pathToFileURL } from "node:url";

const POLICY_PREFIX = "human-stochastic-";

/** human-stochastic-v6 → v6 */
export function poolVersionFromPolicy(policyVersion) {
  if (typeof policyVersion === "string" && policyVersion.startsWith(POLICY_PREFIX)) {
    return policyVersion.slice(POLICY_PREFIX.length);
  }
  return policyVersion;
}

export async function loadPoolDefaults(repoRoot) {
  const typesPath = path.join(
    repoRoot,
    "src/convex/solitaireArena/convex/service/seedPool/solitaireRecordedOpTypes.ts"
  );
  const mod = await import(pathToFileURL(typesPath).href);
  const policyVersion = mod.HUMAN_STOCHASTIC_POLICY_VERSION;
  const poolVersion = poolVersionFromPolicy(policyVersion);
  return {
    policyVersion,
    poolVersion,
    outDir: path.join(repoRoot, "scripts/solitaire/output", `pool-${poolVersion}`),
  };
}
