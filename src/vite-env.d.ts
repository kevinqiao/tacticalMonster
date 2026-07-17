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
  // 可以添加更多环境变量类型
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

