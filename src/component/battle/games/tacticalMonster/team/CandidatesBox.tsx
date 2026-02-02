import React, { useMemo, useRef, useState } from "react";
import { useTeamDeployManager } from "./service/TeamDeployManager";

interface CandidateCellProps {
    onSelect: () => void;
    sprite: { monsterId: string };
    index: number;
}

const CandidateCell: React.FC<CandidateCellProps> = ({ sprite, index, onSelect }) => {
    const { mapDimension, startDrag, endDrag, askAddMonster } = useTeamDeployManager();
    const cellRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);


    const hexHeight = mapDimension?.hexHeight || 0;

    const handleDragStart = (e: React.DragEvent) => {
        setIsDragging(true);

        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", sprite.monsterId);

        // 隐藏原生拖拽预览，使用自定义的 DragPreview 组件
        const emptyImage = new Image();
        emptyImage.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        e.dataTransfer.setDragImage(emptyImage, 0, 0);

        startDrag({ monsterId: sprite.monsterId }, e);
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        // 处理 drop 未触发的情况（如拖拽到无效区域或按 ESC 取消）
        // endDrag() 是幂等的，即使 handleDrop 已调用过也没问题
        endDrag();
    };

    return (
        <div
            ref={cellRef}
            draggable={true}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            style={{
                position: "relative",
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
            <span style={{ fontSize: "12px" }}>{sprite.monsterId}</span>
            {askAddMonster && <div className="candidate-select-button" onClick={onSelect}>select</div>}
        </div>
    );
};

const CandidatesBox: React.FC<{ onSelect: (monsterId: string) => void }> = ({ onSelect }) => {
    const { playerMonsters, selectCanadidate } = useTeamDeployManager();
    const candidates = useMemo(() => {
        return playerMonsters.filter((monster) => !monster.teamPosition);
    }, [playerMonsters]);


    return (
        <>
            {candidates.map((candidate, index) => (
                <CandidateCell
                    key={candidate.monsterId}
                    sprite={candidate}
                    index={index}
                    onSelect={() => onSelect(candidate.monsterId)}
                />
            ))}
        </>
    );
};

export default CandidatesBox;
