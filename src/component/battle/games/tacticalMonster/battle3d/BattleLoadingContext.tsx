/**
 * 战斗 3D 加载状态上下文
 * 收集单卡模型加载完成回调，用于驱动顶部 loading bar
 */

import React from "react";

export const BattleLoadingContext = React.createContext<{
    onModelLoaded: (monsterId: string) => void;
} | null>(null);
