import { useCallback, useRef } from "react";

/**
 * Gate for marking whether initial phase changes have been processed.
 * Uses ref so marking does not trigger re-renders.
 */
export function useInitialPhaseChangesGate() {
    const processedRef = useRef(false);

    const markInitialPhaseChangesProcessed = useCallback(() => {
        processedRef.current = true;
    }, []);

    const isInitialPhaseChangesProcessed = useCallback(() => {
        return processedRef.current;
    }, []);

    return { markInitialPhaseChangesProcessed, isInitialPhaseChangesProcessed };
}
