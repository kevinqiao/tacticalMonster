/**
 * 供布局层收集「单卡模型加载完成」回调，用于驱动顶部 loading bar 的完成状态。
 * 由 TeamLayout3D 提供，GridGround3D 消费并传给 MonsterCard3D。
 */
import React from "react";

export const TeamLayoutLoadingContext = React.createContext<{
    onModelLoaded: (monsterId: string) => void;
} | null>(null);
