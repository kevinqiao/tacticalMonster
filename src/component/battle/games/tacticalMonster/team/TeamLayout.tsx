import React from "react";
import CandidatesBox from "./CandidatesBox";
import DragPreview from "./DragPreview";
import GridGround from "./GridGround";
import { TeamDeployProvider, useTeamDeployManager } from "./service/TeamDeployManager";
import "./styles.css";

// 内部布局组件，使用 Context
const TeamLayoutContent: React.FC = () => {
    const {
        mapDimension,
        containerRef,
        mapContainerRef,
        handleDragOver,
        handleDrop,
    } = useTeamDeployManager();

    return (
        <div
            ref={containerRef}
            style={{ position: "relative", width: "100%", height: "100%", backgroundColor: "red" }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div className="team-editor-container">
                <div style={{
                    width: (mapDimension?.hexWidth || 0) * 2,
                    height: mapDimension?.height,
                    backgroundColor: "transparent"
                }} />
                <div
                    ref={mapContainerRef}
                    style={{
                        width: (mapDimension?.width || 0) - (mapDimension?.hexWidth || 0) * 2,
                        height: mapDimension?.height,
                        backgroundColor: "rgba(255, 0, 0, 0.1)",
                        position: "relative"
                    }}
                >
                    <GridGround />
                </div>
            </div>
            <div className="team-editor-container" style={{ pointerEvents: "none" }}>
                <div style={{
                    width: (mapDimension?.hexWidth || 0) * 2,
                    height: mapDimension?.height,
                    backgroundColor: "transparent",
                    overflowY: "auto",
                    overflowX: "hidden",
                    pointerEvents: "auto"
                }}>
                    <CandidatesBox />
                </div>
                <div
                    style={{
                        width: (mapDimension?.width || 0) - (mapDimension?.hexWidth || 0) * 2,
                        height: mapDimension?.height,
                        backgroundColor: "transparent",
                        pointerEvents: "none",
                    }}
                    onClick={() => console.log("click")}
                />
            </div>
            <div className="team-control-container">
                <button className="team-join-button">Join</button>
            </div>
            <DragPreview />
        </div>
    );
};

// 外部组件，包裹 Provider
const TeamLayout: React.FC<{ stageId?: string | null, onComplete: () => void }> = ({ stageId, onComplete }) => {
    return (
        <TeamDeployProvider stageId={stageId} onComplete={onComplete}>
            <TeamLayoutContent />
        </TeamDeployProvider>
    );
};

export default TeamLayout;
