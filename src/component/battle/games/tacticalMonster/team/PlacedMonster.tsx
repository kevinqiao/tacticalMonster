import { useRef, useState } from "react";
import { useTeamDeployManager } from "./service/TeamDeployManager";

interface PlacedMonsterProps {
    monster: { monsterId: string, q: number, r: number };
}

const PlacedMonster: React.FC<PlacedMonsterProps> = ({ monster }) => {
    const cellRef = useRef<HTMLDivElement>(null);
    const { mapDimension, startDrag, endDrag, removeCandidate } = useTeamDeployManager();
    const [isDragging, setIsDragging] = useState(false);




    const handleDragStart = (e: React.DragEvent) => {
        setIsDragging(true);

        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", monster.monsterId);

        // 隐藏原生拖拽预览，使用自定义的 DragPreview 组件
        const emptyImage = new Image();
        emptyImage.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        e.dataTransfer.setDragImage(emptyImage, 0, 0);

        startDrag(monster.monsterId, e);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setIsDragging(false);

        if (e.dataTransfer.dropEffect === "move") {
            removeCandidate(monster.monsterId);
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
                height: "100%",
                backgroundColor: "green",
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
            <span style={{ fontSize: "12px" }}>{monster.monsterId}</span>
        </div>
    );
};
export default PlacedMonster;