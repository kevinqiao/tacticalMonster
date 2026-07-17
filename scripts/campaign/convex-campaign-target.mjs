import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Campaign Convex 子工程根目录（含 `convex.json`、`.env.local`）。
 * `npx convex run` 必须在此 cwd 下执行，才会绑定到该部署的 dev/prod。
 */
export const CAMPAIGN_CONVEX_PROJECT_DIR = path.resolve(
  scriptDir,
  "../../src/convex/campaign"
);
