/**
 * 画布外：悬停面板挂载点（fixed 坐标由 Canvas 内 TeamLayoutHoverScreenSync 驱动）
 */
import React from "react";
import { TeamLayoutHoverPanelContent } from "./components/TeamLayoutHoverPanel";
import { useTeamLayoutHoverOverlay } from "./TeamLayoutHoverOverlayContext";

const TeamLayoutHoverOverlayUI: React.FC = () => {
    const { hover, overlayPanelRef } = useTeamLayoutHoverOverlay();

    return (
        <div
            ref={overlayPanelRef}
            style={{
                position: "fixed",
                left: 0,
                top: 0,
                visibility: "hidden",
                pointerEvents: "none",
                maxWidth: "min(380px, calc(100vw - 20px))",
                boxSizing: "border-box",
            }}
        >
            {hover ? (
                <TeamLayoutHoverPanelContent
                    title={hover.title}
                    subtitle={hover.subtitle}
                    lines={hover.lines}
                    showRemove={hover.showRemove}
                    onRemove={hover.onRemove}
                    onPanelMouseEnter={hover.onPanelMouseEnter}
                    onPanelMouseLeave={hover.onPanelMouseLeave}
                />
            ) : null}
        </div>
    );
};

export default TeamLayoutHoverOverlayUI;
