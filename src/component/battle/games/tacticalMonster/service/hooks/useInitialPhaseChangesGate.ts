import { useMemo, useRef } from "react";

/**
 * Gate for marking whether initial phase changes have been processed.
 * Uses ref so marking does not trigger re-renders.
 */
export function useInitialPhaseChangesGate() {
    const processedRef = useRef(false);
    return useMemo(
        () => ({
            markProcessed: () => {
                processedRef.current = true;
            },
            isProcessed: () => processedRef.current,
        }),
        []
    );
}
