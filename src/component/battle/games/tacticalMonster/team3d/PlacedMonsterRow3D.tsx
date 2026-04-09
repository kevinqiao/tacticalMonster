/**
 * 已上阵怪物行：3D group 锚点 + 悬停信息（画布外 overlay）
 */
import React, { useRef } from "react";
import * as THREE from "three";
import type { MapDimension } from "../service/TeamDeployManager";
import { MonsterCard3DWithSuspense } from "./components/MonsterCard3D";
import type { HoverStatLine } from "./components/TeamLayoutHoverPanel";
import { useTeamLayoutHoverOverlay } from "./TeamLayoutHoverOverlayContext";

const HOVER_OFFSET_Y = 52;

export type PlacedMonsterRow3DProps = {
    monsterId: string;
    q: number;
    r: number;
    centerX: number;
    centerZ: number;
    mapDimension: MapDimension;
    isDragging: boolean;
    isSelected: boolean;
    statLines: HoverStatLine[];
    displayName: string;
    onDragStart: (id: string) => void;
    onDragMove: (id: string, worldPos: THREE.Vector3) => void;
    onDragEnd: (id: string, worldPos: THREE.Vector3) => void;
    onSelect: (id: string) => void;
    onModelLoaded?: (id: string) => void;
    quitTeam: (id: string) => void;
    cancelHoverHide: () => void;
    scheduleHoverHide: () => void;
    /** 指针在模型上松开后，直到离开模型前不再打开浮层 */
    gateMonsterHoverAfterPointerUp: (monsterId: string) => void;
    clearMonsterHoverReenterGate: (monsterId: string) => void;
    isMonsterHoverOpenBlocked: (monsterId: string) => boolean;
};

export const PlacedMonsterRow3D: React.FC<PlacedMonsterRow3DProps> = ({
    monsterId: mid,
    q,
    r,
    centerX,
    centerZ,
    mapDimension,
    isDragging,
    isSelected,
    statLines,
    displayName,
    onDragStart,
    onDragMove,
    onDragEnd,
    onSelect,
    onModelLoaded,
    quitTeam,
    cancelHoverHide,
    scheduleHoverHide,
    gateMonsterHoverAfterPointerUp,
    clearMonsterHoverReenterGate,
    isMonsterHoverOpenBlocked,
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const { setHover } = useTeamLayoutHoverOverlay();

    return (
        // eslint-disable-next-line react/no-unknown-property -- react-three-fiber group
        <group ref={groupRef} position={[centerX, 0, centerZ]}>
            <MonsterCard3DWithSuspense
                q={q}
                r={r}
                width={mapDimension.hexWidth}
                height={mapDimension.hexHeight}
                position={[0, 0, 0]}
                monsterId={mid}
                isDragging={isDragging}
                isSelected={isSelected}
                onClick={() => onSelect(mid)}
                onDragStart={onDragStart}
                onDragMove={onDragMove}
                onDragEnd={onDragEnd}
                onPointerDownClearHover={cancelHoverHide}
                onPointerUpForHoverGate={gateMonsterHoverAfterPointerUp}
                onPointerEnter={() => {
                    cancelHoverHide();
                    if (isMonsterHoverOpenBlocked(mid)) return;
                    setHover({
                        anchorRef: groupRef as React.RefObject<THREE.Object3D | null>,
                        offsetY: HOVER_OFFSET_Y,
                        title: displayName,
                        subtitle: "Team member",
                        lines: statLines.slice(1),
                        showRemove: true,
                        onRemove: () => {
                            quitTeam(mid);
                            setHover(null);
                            cancelHoverHide();
                        },
                        onPanelMouseEnter: cancelHoverHide,
                        onPanelMouseLeave: scheduleHoverHide,
                    });
                }}
                onPointerLeave={() => {
                    clearMonsterHoverReenterGate(mid);
                    scheduleHoverHide();
                }}
                onModelLoaded={onModelLoaded}
                isPortrait={mapDimension.isPortrait}
            />
        </group>
    );
};
