import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 单条文案若干毫秒后自动清空；组件卸载时清除定时器。
 */
export function useAutoDismissMessage(durationMs = 3500) {
    const [message, setMessage] = useState<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const show = useCallback(
        (next: string) => {
            setMessage(next);
            clearTimer();
            timerRef.current = setTimeout(() => {
                setMessage(null);
                timerRef.current = null;
            }, durationMs);
        },
        [durationMs, clearTimer]
    );

    const clear = useCallback(() => {
        clearTimer();
        setMessage(null);
    }, [clearTimer]);

    useEffect(() => () => clearTimer(), [clearTimer]);

    return { message, show, clear };
}
