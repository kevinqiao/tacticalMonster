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
      "src/convex/yatzArena/convex/service/__tests__/**/*.test.ts",
      "src/convex/tcgArena/convex/service/__tests__/**/*.test.ts",
      "src/convex/match3Arena/convex/service/seedPool/__tests__/**/*.test.ts",
      "src/convex/blockBlast/convex/service/seedPool/__tests__/**/*.test.ts",
      "src/convex/blockBlast/convex/service/__tests__/**/*.test.ts",
      "src/convex/casualPlatform/convex/service/tournament/__tests__/**/*.test.ts",
      "src/convex/casualPlatform/convex/service/weeklyLeague/__tests__/**/*.test.ts",
      "src/convex/casualPlatform/convex/service/payout/__tests__/**/*.test.ts",
      "src/convex/casualPlatform/convex/service/task/__tests__/**/*.test.ts",
      "src/convex/casualPlatform/convex/service/shop/__tests__/**/*.test.ts",
      "src/convex/casualPlatform/convex/data/__tests__/**/*.test.ts",
      "src/convex/casualPlatform/convex/service/botFill/__tests__/**/*.test.ts",
      "src/convex/portal/convex/service/**/__tests__/**/*.test.ts",
    ],
  },
});
