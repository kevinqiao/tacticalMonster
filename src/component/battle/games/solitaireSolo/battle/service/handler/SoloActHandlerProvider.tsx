/**
 * 全局唯一 useActHandler 实例。
 * SoloDnDProvider 与 GamePlayer 若各自调用 hook，得分层 state 会写到 DnD 那份上，
 * GamePlayer 的 overlay 永远不打开 → 达标后棋盘 COMPLETED 却无弹层（表现为卡死）。
 */
import React, { createContext, ReactNode, useContext } from "react";
import useActHandler from "./useActHandler";

type SoloActHandlerValue = ReturnType<typeof useActHandler>;

const SoloActHandlerContext = createContext<SoloActHandlerValue | null>(null);

export const SoloActHandlerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const value = useActHandler();
    return (
        <SoloActHandlerContext.Provider value={value}>
            {children}
        </SoloActHandlerContext.Provider>
    );
};

export function useSoloActHandler(): SoloActHandlerValue {
    const ctx = useContext(SoloActHandlerContext);
    if (!ctx) {
        throw new Error("useSoloActHandler must be used within a SoloActHandlerProvider");
    }
    return ctx;
}

export default SoloActHandlerProvider;
