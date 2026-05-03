import { useEffect } from "react";

export function useAppPerformanceMonitor(): void {
    useEffect(() => {
        const isDevelopment =
            typeof process !== "undefined" && process.env?.NODE_ENV === "development";
        if (isDevelopment) {
            const startTime = performance.now();

            return () => {
                const endTime = performance.now();
                console.log(`App initialization time: ${(endTime - startTime).toFixed(2)}ms`);
            };
        }
    }, []);
}
