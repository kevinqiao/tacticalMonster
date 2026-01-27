import React from "react";
import { useTeamDeployManager } from "./service/TeamDeployManager";

const DragPreview: React.FC = () => {
    const { dragMonster, dragPreviewContainerRef, mapDimension } = useTeamDeployManager();
    const size = mapDimension?.hexWidth || 80;
    const isValidDrop = true;

    return (
        <div
            ref={dragPreviewContainerRef}
            style={{
                position: "fixed",
                left: 0,
                top: 0,
                // left: dragPreviewPosition.x - size / 2,
                // top: dragPreviewPosition.y - size / 2,
                width: size,
                height: size,
                background: isValidDrop
                    ? "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)"
                    : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: "bold",
                fontSize: 14,
                boxShadow: isValidDrop
                    ? "0 8px 24px rgba(76, 175, 80, 0.5)"
                    : "0 8px 24px rgba(102, 126, 234, 0.5)",
                pointerEvents: "none",
                zIndex: 9999,
                transform: isValidDrop ? "scale(1.1)" : "scale(1)",
                transition: "transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease",
                border: isValidDrop ? "3px solid #fff" : "2px solid rgba(255,255,255,0.5)",
                opacity: 0,
                visibility: "hidden",
            }}
        >
            {dragMonster?.monsterId}
        </div>
    );
};

export default DragPreview;
