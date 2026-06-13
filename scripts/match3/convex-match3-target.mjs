import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const MATCH3_CONVEX_PROJECT_DIR = path.resolve(scriptDir, "../../src/convex/match3Arena");
