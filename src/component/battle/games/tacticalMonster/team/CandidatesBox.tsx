import React, { useRef, useState } from "react";
import { useTeamDeployManager } from "./service/TeamDeployManager";

interface CandidateCellProps {
    sprite: { monster_id: string };
    index: number;
}

const CandidateCell: React.FC<CandidateCellProps> = ({ sprite, index }) => {
    const { mapDimension, startDrag, endDrag, removeCandidate } = useTeamDeployManager();
    const cellRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);


    const hexHeight = mapDimension?.hexHeight || 0;

    const handleDragStart = (e: React.DragEvent) => {
        setIsDragging(true);

        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", sprite.monster_id);

        // 隐藏原生拖拽预览，使用自定义的 DragPreview 组件
        const emptyImage = new Image();
        emptyImage.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        e.dataTransfer.setDragImage(emptyImage, 0, 0);

        startDrag(sprite.monster_id, e);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setIsDragging(false);

        if (e.dataTransfer.dropEffect === "move") {
            removeCandidate(sprite.monster_id);
        }

        // 无论 drop 是否触发，都要清除拖拽状态和预览
        endDrag();
        e.dataTransfer.clearData();
    };

    return (
        <div
            ref={cellRef}
            draggable={true}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            style={{
                width: "100%",
                height: hexHeight,
                backgroundColor: index % 2 === 0 ? "black" : "green",
                cursor: "grab",
                userSelect: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #ccc",
                boxSizing: "border-box",
                opacity: isDragging ? 0.5 : 1,
                transition: "opacity 0.2s",
            }}
        >
            <span style={{ fontSize: "12px" }}>{sprite.monster_id}</span>
        </div>
    );
};

const CandidatesBox: React.FC = () => {
    const { candidates } = useTeamDeployManager();

    return (
        <div style={{ width: "100%", height: "100%" }}>
            {candidates.map((candidate, index) => (
                <CandidateCell
                    key={candidate.monster_id}
                    sprite={candidate}
                    index={index}
                />
            ))}
        </div>
    );
};

export default CandidatesBox;
