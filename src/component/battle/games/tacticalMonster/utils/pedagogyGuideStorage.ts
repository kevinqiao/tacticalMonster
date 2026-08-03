/**
 * 未登录（无 uid）时：引导横幅「完成/跳过」仅写 localStorage。
 * 已登录时由 Convex mr_player_pedagogy_guide_ui + dismissGuideUi 同步跨设备。
 */

export function getGuideStorageKey(uid: string | undefined, ruleId: string): string {
    const u = uid?.trim() ? uid : "guest";
    return `tm:guide:v1:${u}:${ruleId}`;
}

export function isGuideDone(uid: string | undefined, ruleId: string | undefined): boolean {
    if (!ruleId || typeof window === "undefined") return true;
    try {
        return window.localStorage.getItem(getGuideStorageKey(uid, ruleId)) === "1";
    } catch {
        return false;
    }
}

export function markGuideDone(uid: string | undefined, ruleId: string | undefined): void {
    if (!ruleId || typeof window === "undefined") return;
    try {
        window.localStorage.setItem(getGuideStorageKey(uid, ruleId), "1");
    } catch {
        /* ignore quota / private mode */
    }
}
