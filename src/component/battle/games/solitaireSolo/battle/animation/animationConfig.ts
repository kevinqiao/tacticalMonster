/** Solitaire Solo 动画参数集中配置 */
export const SOLO_ANIMATION_CONFIG = {
    duration: {
        move: {
            /** 手拖/普通落子：略长 + power3.out 比 power2.in 更「丝滑」到站 */
            normal: 0.4,
            /** 自动收 foundation：仍偏快，用 out 缓出避免顿一下 */
            autoFoundation: 0.1,
        },
        flip: {
            normal: 0.28,
            autoFoundation: 0.08,
        },
    },
    /** GSAP 缓动名 */
    ease: {
        move: {
            normal: "power3.out",
            autoFoundation: "power2.out",
        },
    },
    zIndex: {
        moveFlightBase: 50000,
        moveFlightStackOffset: 1000,
        dragFlightBase: 120000,
    },
} as const;

