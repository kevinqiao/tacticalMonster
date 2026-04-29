/** Block Blast 动画与层级常量（对齐 solitaireSolo 的 animationConfig 用法） */
export const BLOCK_BLAST_ANIMATION_CONFIG = {
    duration: {
        dragCancel: 0.25,
        /** 消除：闪亮一帧 */
        clearFlash: 0.11,
        /** 消除：缩小淡出 */
        clearVanish: 0.22,
        /** 整段（flash + vanish）供调用方预估等待时间 */
        clearLinesTotal: 0.33,
        clearPulse: 0.22,
    },
    clear: {
        /** 同排/同列格子的错开时间，形成扫过感 */
        stagger: 0.018,
    },
    zIndex: {
        dragFlightBase: 50000,
    },
} as const;
