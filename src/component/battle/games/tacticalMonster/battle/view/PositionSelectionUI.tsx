/**
 * 位置选择UI组件
 * 显示所有可选位置，让用户选择移动目标
 */

import React, { useEffect, useRef } from "react";
import { GridCellSprite, MonsterSprite } from "../../types/CombatTypes";
import { clearPositionHighlights, getScoreColor, highlightPossiblePositions } from "../utils/positionHighlightUtils";

interface PositionSelectionUIProps {
    positions: Array<{ q: number; r: number; score: number }>;
    character: MonsterSprite;
    target: MonsterSprite;
    gridCells: GridCellSprite[][];
    onSelect: (position: { q: number; r: number }) => void;
    onCancel: () => void;
}

export const PositionSelectionUI: React.FC<PositionSelectionUIProps> = ({
    positions,
    gridCells,
    onSelect,
    onCancel
}) => {
    const highlightedPositionsRef = useRef<Array<{ q: number; r: number }>>([]);

    // 在地图上高亮显示所有可选位置
    useEffect(() => {
        if (positions.length > 0) {
            highlightPossiblePositions(positions, gridCells);
            highlightedPositionsRef.current = positions;
        }

        return () => {
            // 清理高亮
            if (highlightedPositionsRef.current.length > 0) {
                clearPositionHighlights(highlightedPositionsRef.current, gridCells);
            }
        };
    }, [positions, gridCells]);

    const handlePositionClick = (position: { q: number; r: number }) => {
        // 清除高亮
        clearPositionHighlights(highlightedPositionsRef.current, gridCells);
        // 选择位置
        onSelect(position);
    };

    const handleCancel = () => {
        // 清除高亮
        clearPositionHighlights(highlightedPositionsRef.current, gridCells);
        // 取消选择
        onCancel();
    };

    return (
        <div className="position-selection-ui" style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: "16px",
            borderRadius: "8px",
            zIndex: 10000,
            maxWidth: "600px",
            maxHeight: "400px",
            overflowY: "auto"
        }}>
            <h3 style={{ color: "white", margin: "0 0 12px 0", fontSize: "16px" }}>
                选择移动位置
            </h3>
            <div className="positions-list" style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: "8px",
                marginBottom: "12px"
            }}>
                {positions.map((pos, index) => (
                    <div
                        key={`${pos.q}-${pos.r}`}
                        className="position-option"
                        onClick={() => handlePositionClick(pos)}
                        style={{
                            padding: "8px",
                            backgroundColor: getScoreColor(pos.score),
                            borderRadius: "4px",
                            cursor: "pointer",
                            transition: "transform 0.2s",
                            color: "white",
                            fontSize: "12px"
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.05)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                        }}
                    >
                        <div style={{ fontWeight: "bold" }}>
                            位置 ({pos.q}, {pos.r})
                        </div>
                        <div style={{ fontSize: "11px", opacity: 0.9 }}>
                            评分: {pos.score.toFixed(1)}
                        </div>
                        <div style={{ fontSize: "10px", opacity: 0.8 }}>
                            排名: #{index + 1}
                        </div>
                    </div>
                ))}
            </div>
            <button
                onClick={handleCancel}
                style={{
                    padding: "8px 16px",
                    backgroundColor: "#e74c3c",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px"
                }}
            >
                取消
            </button>
        </div>
    );
};
