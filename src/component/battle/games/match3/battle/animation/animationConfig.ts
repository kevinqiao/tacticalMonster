/** Match-3 动画常量（对齐 Block Blast animationConfig 用法） */
export const CELL_SIZE_PX = 40;
export const CELL_GAP_PX = 4;
export const CELL_STEP_PX = CELL_SIZE_PX + CELL_GAP_PX;

export const MATCH3_ANIMATION_CONFIG = {
  duration: {
    clearFlash: 0.1,
    clearVanish: 0.18,
    fall: 0.26,
    spawn: 0.26,
    swap: 0.2,
    cascadeRoundTotal: 0.34,
    invalidRevert: 0.22,
  },
  clear: {
    stagger: 0.014,
  },
  fall: {
    stagger: 0.012,
  },
  spawn: {
    stagger: 0.012,
  },
} as const;
