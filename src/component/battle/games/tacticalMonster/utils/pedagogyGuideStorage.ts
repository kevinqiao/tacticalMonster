/**
 * 3D 战斗教学引导：按 ruleId 首次完成/跳过后不再显示（localStorage）
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
