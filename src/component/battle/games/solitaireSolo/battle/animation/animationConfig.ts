/** Solitaire Solo 动画参数集中配置 */
export const SOLO_ANIMATION_CONFIG = {
    duration: {
        move: {
            /** 手拖/普通落子：略长 + power3.out 比 power2.in 更「丝滑」到站 */
            normal: 0.4,
            /**
             * 自动收 foundation：单段直达槽位。
             * 清盘用交错起飞（autoFoundationStagger），时长略长更顺滑。
             */
            autoFoundation: 0.22,
            /** 下一张起飞间隔（秒）；小于飞行时长 → 多牌同时在空中 */
            autoFoundationStagger: 0.055,
        },
        flip: {
            normal: 0.28,
            autoFoundation: 0.1,
        },
        /** waste → talon 回收 */
        recycle: {
            card: 0.32,
            stagger: 0.028,
        },
        /** talon → waste 抽牌 */
        draw: {
            /** 单张飞到 waste */
            flight: 0.38,
            /** 逐张 peel 间隔 */
            stagger: 0.07,
            /** 翻面（嵌在飞行中段） */
            flip: 0.22,
            /** 已有 waste fan 重排 */
            wasteReposition: 0.34,
        },
    },
    /** GSAP 缓动名 */
    ease: {
        move: {
            normal: "power3.out",
            /** 清盘交错飞行：稍柔和的减速，避免逐张「顿一下」 */
            autoFoundation: "power2.out",
        },
        recycle: "power2.in",
        draw: {
            flight: "power3.out",
            flip: "sine.inOut",
            wasteReposition: "power3.out",
        },
    },
    zIndex: {
        moveFlightBase: 50000,
        moveFlightStackOffset: 1000,
        dragFlightBase: 120000,
    },
} as const;

