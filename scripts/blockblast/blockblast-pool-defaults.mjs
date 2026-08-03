import path from "node:path";
import { pathToFileURL } from "node:url";

const POLICY_PREFIX = "block-blast-stochastic-";

/** block-blast-stochastic-v3 → v3 */
export function poolVersionFromPolicy(policyVersion) {
  if (typeof policyVersion === "string" && policyVersion.startsWith(POLICY_PREFIX)) {
    return policyVersion.slice(POLICY_PREFIX.length);
  }
  return policyVersion;
}

export async function loadPoolDefaults(repoRoot) {
  const typesPath = path.join(
    repoRoot,
    "src/convex/blockBlast/convex/service/seedPool/blockBlastRecordedOpTypes.ts"
  );
  const mod = await import(pathToFileURL(typesPath).href);
  const policyVersion = mod.BLOCK_BLAST_POLICY_VERSION;
  const poolVersion = poolVersionFromPolicy(policyVersion);
  return {
    policyVersion,
    poolVersion,
    outDir: path.join(repoRoot, "scripts/blockblast/output", `pool-${poolVersion}`),
  };
}
