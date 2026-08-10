/**
 * 走子/抽牌同步单飞锁（模块级，供 watchdog 与 DnD/act handler 共用）。
 * React state 的 animating 清掉后若此锁仍为 true，会表现为「能按下但完全不能走子」。
 */
export const soloActLock = {
    inFlight: false,
    clear() {
        this.inFlight = false;
    },
};
