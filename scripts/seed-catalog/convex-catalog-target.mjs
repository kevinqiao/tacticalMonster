import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
/** casualPlatform Convex project (seed catalog lives here). */
export const CATALOG_CONVEX_PROJECT_DIR = path.resolve(
  scriptDir,
  "../../src/convex/casualPlatform"
);
