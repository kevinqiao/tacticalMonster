import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");

/** Override: `SEED_CATALOG_CONVEX_DIR=src/convex/portal` for Portal deployment. */
export const CATALOG_CONVEX_PROJECT_DIR = process.env.SEED_CATALOG_CONVEX_DIR
  ? path.resolve(repoRoot, process.env.SEED_CATALOG_CONVEX_DIR)
  : path.resolve(scriptDir, "../../src/convex/casualPlatform");
