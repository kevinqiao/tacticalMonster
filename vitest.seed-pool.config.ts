import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^convex\/(server|react|values|browser)$/,
        replacement: path.resolve(__dirname, "node_modules/convex/$1"),
      },
      { find: /^convex\/(.+)$/, replacement: path.resolve(__dirname, "src/convex/$1") },
    ],
  },
  test: {
    globals: true,
    environment: "node",
    include: [
      "src/convex/solitaireArena/convex/service/seedPool/__tests__/**/*.test.ts",
      "src/convex/towerArena/convex/service/__tests__/**/*.test.ts",
      "src/convex/towerArena/convex/service/seedPool/__tests__/**/*.test.ts",
      "src/convex/match3Arena/convex/service/__tests__/**/*.test.ts",
      "src/convex/match3Arena/convex/service/seedPool/__tests__/**/*.test.ts",
    ],
  },
});
