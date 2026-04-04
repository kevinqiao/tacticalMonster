import React from "react";
import type { MapDimension } from "../../service/TeamDeployManager";
import { CanvasWithControls } from "../BattleCanvas3D";
import type { BattleCellState, UseBattleGridStateReturn } from "../handler/useBattleGridState";
import type { BattleVenuePedagogySnapshot } from "../hooks/useBattleVenuePedagogy";
import { BattleVenuePedagogyOverlays } from "./BattleVenuePedagogyOverlays";
import GameOver from "./gameover/GameOver";
import { TurnOrderBar } from "./turnbar/TurnOrderBar";

export type BattleVenue3DSceneProps = {
    skillError: string | null;
    pedagogy: BattleVenuePedagogySnapshot;
    gridState: UseBattleGridStateReturn;
    mapDimension: MapDimension | null;
    isPortrait: boolean;
    cameraPosition: [number, number, number];
    cameraTarget: [number, number, number];
    minDistance: number;
    maxDistance: number;
    orthoZoom: number;
    cameraUp?: [number, number, number];
    mapContainerStyle: React.CSSProperties;
    onModelLoaded: (monsterId: string) => void;
    handleProgress: (progress: number) => void;
    getCellState: (q: number, r: number) => BattleCellState;
    onCellClick?: (logicQ: number, logicR: number) => void;
    pedagogyAttackTargetPulseBoost: boolean;
    skillPanel: React.ReactNode;
};

/**
 * 3D 战场共用布局：引导条、技能错误 toast、背景、Canvas、底部先攻条 + 技能区插槽。
 */
export const BattleVenue3DScene: React.FC<BattleVenue3DSceneProps> = ({
    skillError,
    pedagogy,
    gridState,
    mapDimension,
    isPortrait,
    cameraPosition,
    cameraTarget,
    minDistance,
    maxDistance,
    orthoZoom,
    cameraUp,
    mapContainerStyle,
    onModelLoaded,
    handleProgress,
    getCellState,
    onCellClick,
    pedagogyAttackTargetPulseBoost,
    skillPanel,
}) => (
    <div
        style={{
            position: "relative",
            width: "100%",
            height: "100%",
            overflow: "hidden",
        }}
    >
        <BattleVenuePedagogyOverlays skillError={skillError} pedagogy={pedagogy} />
        {skillError && (
            <div
                style={{
                    position: "absolute",
                    top: 12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 10,
                    padding: "8px 16px",
                    background: "rgba(180, 0, 0, 0.9)",
                    color: "#fff",
                    borderRadius: 8,
                    fontSize: 13,
                    maxWidth: "90%",
                    textAlign: "center",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                    pointerEvents: "none",
                }}
            >
                技能使用失败: {skillError}
            </div>
        )}
        <div
            style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: isPortrait ? "100vh" : "100%",
                height: isPortrait ? "100vw" : "100%",
                backgroundImage: "url(/assets/battle_bg.png)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                transform: isPortrait ? "translate(-50%, -50%) rotate(-90deg)" : "translate(-50%, -50%)",
                pointerEvents: "none",
                zIndex: 0,
            }}
        />

        <div style={{ ...mapContainerStyle, zIndex: 1 }}>
            {mapDimension && (
                <div style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}>
                    <CanvasWithControls
                        cameraPosition={cameraPosition}
                        target={cameraTarget}
                        mapDimension={mapDimension}
                        minDistance={minDistance}
                        maxDistance={maxDistance}
                        onProgress={handleProgress}
                        onModelLoaded={onModelLoaded}
                        isPortrait={isPortrait}
                        orthoZoom={orthoZoom}
                        cameraUp={cameraUp}
                        getCellState={getCellState}
                        getWalkableDistance={gridState.getWalkableDistance}
                        getWalkableMoveRange={gridState.getWalkableMoveRange}
                        onCellClick={onCellClick}
                        pedagogyAttackTargetPulseBoost={pedagogyAttackTargetPulseBoost}
                    />
                </div>
            )}
        </div>
        <div
            style={{
                position: "absolute",
                bottom: 8,
                left: 8,
                right: 8,
                zIndex: 2,
                pointerEvents: "auto",
                display: "grid",
                gridTemplateColumns: "minmax(120px, 55%) minmax(160px, 1fr)",
                gap: 12,
                alignItems: "end",
            }}
        >
            <div style={{ minWidth: 0, overflow: "hidden" }}>
                <TurnOrderBar />
            </div>
            <div
                style={{
                    minWidth: 0,
                    display: "flex",
                    flexWrap: "wrap",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    alignContent: "flex-end",
                    gap: 4,
                    background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
                    padding: "4px 0 0 8px",
                }}
            >
                {skillPanel}
            </div>
        </div>
        <div
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                height: "100%",
                width: "100%",
                zIndex: 5,
                pointerEvents: "none",
            }}
        >
            <GameOver />
        </div>
    </div>
);
