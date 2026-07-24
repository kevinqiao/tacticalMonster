/// <reference types="vite/client" />

declare module "*.svg?raw" {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly VITE_CONVEX_URL?: string;
  /** Block Blast subproject (`src/convex/blockBlast`); must match that folder’s CONVEX_URL */
  readonly VITE_CONVEX_URL_BLOCKBLAST?: string;
  /** Solitaire Arena (`src/convex/solitaireArena`); must match that deployment’s CONVEX_URL */
  readonly VITE_CONVEX_URL_SOLITAIRE?: string;
  /** Tower Arena (`src/convex/towerArena`); must match that deployment’s CONVEX_URL */
  readonly VITE_CONVEX_URL_TOWER?: string;
  /** Match-3 Arena (`src/convex/match3Arena`); must match that deployment’s CONVEX_URL */
  readonly VITE_CONVEX_URL_MATCH3?: string;
  /** Yatz Arena (`src/convex/yatzArena`); must match that deployment’s CONVEX_URL */
  readonly VITE_CONVEX_URL_YATZ?: string;
  /** Casual platform (`src/convex/casualPlatform`); separate Convex deployment */
  readonly VITE_CONVEX_URL_CASUAL?: string;
  /** Campaign SaaS (`src/convex/campaign`); must match that folder’s CONVEX_URL */
  readonly VITE_CONVEX_URL_CAMPAIGN?: string;
  readonly VITE_CONVEX_URL_PORTAL?: string;
  /** CrazyGames partner pid fallback when URL partner is unresolved (default 100). */
  readonly VITE_CRAZYGAMES_PARTNER_PID?: string;
  /** Portal path rewritten on CrazyGames CDN hosts (default /gc/crazygames/solitaire). */
  readonly VITE_CRAZYGAMES_ENTRY_PATH?: string;
  /** Dev: mock rewarded ad replay (`1` / `0`). */
  readonly VITE_AD_REPLAY_MOCK?: string;
  readonly VITE_AD_REPLAY_MOCK_DURATION_MS?: string;
  /** Dev: mock side banners. */
  readonly VITE_AD_DISPLAY_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

