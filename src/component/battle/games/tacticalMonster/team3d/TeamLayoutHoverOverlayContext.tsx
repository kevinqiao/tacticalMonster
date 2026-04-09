/**
 * 编队 3D：画布外 DOM 悬停面板 + 3D anchor 投影定位（由 TeamLayoutHoverScreenSync 驱动）
 */
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { HoverStatLine } from "./components/TeamLayoutHoverPanel";

export type TeamLayoutHoverState = {
    /** 跟踪的世界锚点（通常为角色外层的 <group>） */
    anchorRef: React.RefObject<THREE.Object3D | null>;
    /** 相对 anchor 局部 Y 轴抬高（世界方向随 group 旋转） */
    offsetY?: number;
    title: string;
    subtitle?: string;
    lines: HoverStatLine[];
    showRemove?: boolean;
    onRemove?: () => void;
    onPanelMouseEnter?: () => void;
    onPanelMouseLeave?: () => void;
};

type TeamLayoutHoverOverlayContextValue = {
    hover: TeamLayoutHoverState | null;
    setHover: (next: TeamLayoutHoverState | null) => void;
    /** 画布外面板根节点，由 ScreenSync 每帧写 position */
    overlayPanelRef: React.RefObject<HTMLDivElement>;
};

const TeamLayoutHoverOverlayContext = createContext<TeamLayoutHoverOverlayContextValue | null>(null);

export const TeamLayoutHoverOverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [hover, setHoverState] = useState<TeamLayoutHoverState | null>(null);
    const overlayPanelRef = useRef<HTMLDivElement>(null);

    const setHover = useCallback((next: TeamLayoutHoverState | null) => {
        setHoverState(next);
    }, []);

    const value = useMemo(
        () => ({
            hover,
            setHover,
            overlayPanelRef,
        }),
        [hover, setHover],
    );

    return (
        <TeamLayoutHoverOverlayContext.Provider value={value}>{children}</TeamLayoutHoverOverlayContext.Provider>
    );
};

export const useTeamLayoutHoverOverlay = (): TeamLayoutHoverOverlayContextValue => {
    const ctx = useContext(TeamLayoutHoverOverlayContext);
    if (!ctx) {
        throw new Error("useTeamLayoutHoverOverlay must be used within TeamLayoutHoverOverlayProvider");
    }
    return ctx;
};
