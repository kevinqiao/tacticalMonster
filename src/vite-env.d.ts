/// <reference types="vite/client" />

declare module "*.svg?raw" {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly VITE_CONVEX_URL?: string;
  /** Block Blast subproject (`src/convex/blockBlast`); must match that folder’s CONVEX_URL */
  readonly VITE_CONVEX_URL_BLOCKBLAST?: string;
  readonly REACT_APP_CONVEX_URL?: string; // 向后兼容
  // 可以添加更多环境变量类型
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

