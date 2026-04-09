/**
 * 在 Canvas 内每帧将 anchor 世界坐标投影到视口像素，写入画布外 overlay 的 fixed 定位。
 * 视口钳制：靠上时若上方放不下则翻到锚点下方；左右不出屏。
 */
import { useFrame, useThree } from "@react-three/fiber";
import React, { useMemo } from "react";
import * as THREE from "three";
import { useTeamLayoutHoverOverlay } from "./TeamLayoutHoverOverlayContext";

const GAP_PX = 10;
/** 翻到锚点下方时：面板顶边相对「格子中心/脚底」投影的留白（用脚底而非头顶锚点，避免挡住半格） */
const GAP_BELOW_FOOT_PX = 12;
/** 浮层与屏幕边的最小留白 */
const VIEW_MARGIN = 10;
/** offsetWidth/Height 为 0 时（首帧）的占位，避免钳制算错 */
const FALLBACK_W = 280;
const FALLBACK_H = 200;

function clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
}

const TeamLayoutHoverScreenSync: React.FC = () => {
    const { camera, gl } = useThree();
    const { hover, overlayPanelRef } = useTeamLayoutHoverOverlay();
    const worldTip = useMemo(() => new THREE.Vector3(), []);
    const worldFoot = useMemo(() => new THREE.Vector3(), []);

    useFrame(() => {
        const el = overlayPanelRef.current;
        if (!el) return;

        if (!hover?.anchorRef?.current) {
            el.style.visibility = "hidden";
            el.style.pointerEvents = "none";
            return;
        }

        const anchor = hover.anchorRef.current;
        const oy = hover.offsetY ?? 52;

        worldTip.set(0, oy, 0);
        anchor.localToWorld(worldTip);
        worldTip.project(camera);

        worldFoot.set(0, 0, 0);
        anchor.localToWorld(worldFoot);
        worldFoot.project(camera);

        const rect = gl.domElement.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        const xTip = (worldTip.x * 0.5 + 0.5) * w + rect.left;
        const yTip = (-worldTip.y * 0.5 + 0.5) * h + rect.top;
        const yFoot = (-worldFoot.y * 0.5 + 0.5) * h + rect.top;

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let pw = el.offsetWidth;
        let ph = el.offsetHeight;
        if (pw < 2) pw = FALLBACK_W;
        if (ph < 2) ph = FALLBACK_H;

        // 默认：面板在头顶锚点上方（底边贴近 yTip 上方 GAP）
        let panelLeft = xTip - pw / 2;
        let panelTop = yTip - GAP_PX - ph;

        if (panelTop < VIEW_MARGIN) {
            // 上方被裁切 → 改到格子下方：以脚底/格心投影 yFoot 为参照，避免面板仍压在格子上
            panelTop = yFoot + GAP_BELOW_FOOT_PX;
        }

        panelLeft = clamp(panelLeft, VIEW_MARGIN, vw - pw - VIEW_MARGIN);
        panelTop = clamp(panelTop, VIEW_MARGIN, vh - ph - VIEW_MARGIN);

        el.style.position = "fixed";
        el.style.left = `${panelLeft}px`;
        el.style.top = `${panelTop}px`;
        el.style.transform = "none";
        el.style.visibility = "visible";
        el.style.pointerEvents = "none";
        el.style.zIndex = "250";
    });

    return null;
};

export default TeamLayoutHoverScreenSync;
