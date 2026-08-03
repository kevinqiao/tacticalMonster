/**
 * TurnOrderBar Context - 供 TurnItemSprite 获取 exitingKeys、reappearingKeys 等状态
 */

import React, { createContext, useContext } from "react";

export interface TurnOrderBarContextValue {
    exitingKeys: Set<string>;
    reappearingKeys: Set<string>;
    firstActiveKey: string | null;
    highlightEnabled: boolean;
    registerItemRef: (key: string, el: HTMLDivElement | null) => void;
}

export const TurnOrderBarContext = createContext<TurnOrderBarContextValue | null>(null);

export function useTurnOrderBarContext(): TurnOrderBarContextValue {
    const ctx = useContext(TurnOrderBarContext);
    if (!ctx) {
        throw new Error("TurnItemSprite must be used within TurnOrderBarContext.Provider");
    }
    return ctx;
}
