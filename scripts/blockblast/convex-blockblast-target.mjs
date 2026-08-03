import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Block Blast Convex 子工程根目录（含 `convex.json`、`.env.local`）。
 * `npx convex run` 须在此 cwd 下执行。
 */
export const BLOCK_BLAST_CONVEX_PROJECT_DIR = path.resolve(
  scriptDir,
  "../../src/convex/blockBlast"
);
