import gsap from "gsap";
import React, { useCallback, useEffect } from "react";
import { Stage } from "../types/StageTypes";
import CandidatesBox from "./CandidatesBox";
import DragPreview from "./DragPreview";
import GridGround from "./GridGround";
import StageGrid from "./StageGrid";
import { TeamDeployProvider, useTeamDeployManager } from "./service/TeamDeployManager";
import "./styles.css";

// 内部布局组件，使用 Context
const TeamLayoutContent: React.FC = () => {

    const {
        askAddMonster,
        mapDimension,
        candidateContainerRef,
        containerRef,
        mapContainerRef,
        handleDragOver,
        handleDrop,
        selectCanadidate,
    } = useTeamDeployManager();
    const openCandidates = useCallback(() => {
        gsap.to(candidateContainerRef.current, {
            autoAlpha: 1,
            duration: 0.5,
            ease: "power2.inOut",
        });

    }, []);
    const closeCandidates = useCallback(() => {
        gsap.to(candidateContainerRef.current, {
            autoAlpha: 0,
            duration: 0.5,
            ease: "power2.inOut",
        });

    }, []);
    const handleSelectCandidate = useCallback((monsterId: string) => {
        closeCandidates();
        selectCanadidate(monsterId);
    }, [closeCandidates, selectCanadidate]);
    useEffect(() => {
        if (askAddMonster) {
            openCandidates();
        }
    }, [askAddMonster]);


    return (
        <div
            ref={containerRef}
            style={{ position: "relative", width: "100%", height: "100%", backgroundColor: "red" }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div className="team-editor-container">

                <div
                    ref={mapContainerRef}
                    className="team-map-container"
                    style={{
                        width: mapDimension?.width,
                        height: mapDimension?.height,
                        backgroundColor: "transparent",
                    }}
                >
                    <GridGround />
                    <StageGrid />
                </div>
                <div
                    ref={candidateContainerRef}
                    className="candidates-container"
                    style={{
                        opacity: 0,
                        visibility: "hidden",
                        backgroundColor: "white",
                        overflowY: "auto",
                        overflowX: "hidden",
                        pointerEvents: "auto"
                    }}
                >
                    <CandidatesBox onSelect={handleSelectCandidate} />
                    <div className="close-candidates-button" onClick={closeCandidates}>X</div>
                </div>

            </div>
            <div className="team-control-container">
                <button className="team-join-button">Join</button>
            </div>
            <DragPreview />
        </div>
    );
};

// 外部组件，包裹 Provider
const TeamLayout: React.FC<{ stage?: Stage, onComplete: () => void }> = ({ stage, onComplete }) => {
    return (
        <TeamDeployProvider stage={stage} >
            <TeamLayoutContent />
        </TeamDeployProvider>
    );
};

export default TeamLayout;
