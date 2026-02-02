/**
 * 位置高亮工具
 * 用于在地图上高亮显示可选位置
 */

import gsap from "gsap";
import { GridCellSprite } from "../../types/CombatTypes";

/**
 * 根据评分返回颜色
 * @param score - 评分（0-100）
 * @returns 颜色字符串
 */
export function getScoreColor(score: number): string {
    if (score >= 80) {
        return "rgba(46, 204, 113, 0.7)";  // 绿色（高分）
    } else if (score >= 60) {
        return "rgba(52, 152, 219, 0.7)";  // 蓝色（中高分）
    } else if (score >= 40) {
        return "rgba(241, 196, 15, 0.7)";  // 黄色（中等）
    } else if (score >= 20) {
        return "rgba(230, 126, 34, 0.7)";  // 橙色（中低分）
    } else {
        return "rgba(231, 76, 60, 0.7)";  // 红色（低分）
    }
}

/**
 * 高亮单个位置
 * @param position - 位置坐标
 * @param gridCells - 地图格子
 * @param color - 高亮颜色（可选）
 * @param score - 评分（用于自动选择颜色）
 */
export function highlightPosition(
    position: { q: number; r: number },
    gridCells: GridCellSprite[][],
    color?: string,
    score?: number
): void {
    const cell = gridCells[position.r]?.[position.q];
    if (!cell?.element) return;

    const highlightColor = color || (score !== undefined ? getScoreColor(score) : "rgba(52, 152, 219, 0.7)");

    // 使用 GSAP 设置高亮
    gsap.set(cell.element, {
        backgroundColor: highlightColor,
        opacity: 0.7
    });

    // 添加评分文字（如果有）
    if (score !== undefined && cell.element) {
        // 移除旧的评分文字
        const oldText = cell.element.querySelector('.position-score-text');
        if (oldText) {
            oldText.remove();
        }

        // 创建新的评分文字
        const scoreText = document.createElement('div');
        scoreText.className = 'position-score-text';
        scoreText.textContent = score.toFixed(0);
        scoreText.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 12px;
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
            pointer-events: none;
            z-index: 1000;
        `;
        cell.element.appendChild(scoreText);
    }
}

/**
 * 清除单个位置高亮
 * @param position - 位置坐标
 * @param gridCells - 地图格子
 */
export function clearPositionHighlight(
    position: { q: number; r: number },
    gridCells: GridCellSprite[][]
): void {
    const cell = gridCells[position.r]?.[position.q];
    if (!cell?.element) return;

    // 清除背景色
    gsap.set(cell.element, {
        backgroundColor: "transparent",
        opacity: 1
    });

    // 移除评分文字
    const scoreText = cell.element.querySelector('.position-score-text');
    if (scoreText) {
        scoreText.remove();
    }
}

/**
 * 高亮所有可选位置
 * @param positions - 位置列表（包含评分）
 * @param gridCells - 地图格子
 */
export function highlightPossiblePositions(
    positions: Array<{ q: number; r: number; score: number }>,
    gridCells: GridCellSprite[][]
): void {
    positions.forEach((pos) => {
        highlightPosition(pos, gridCells, undefined, pos.score);
    });
}

/**
 * 清除所有位置高亮
 * @param positions - 位置列表
 * @param gridCells - 地图格子
 */
export function clearPositionHighlights(
    positions: Array<{ q: number; r: number }>,
    gridCells: GridCellSprite[][]
): void {
    positions.forEach((pos) => {
        clearPositionHighlight(pos, gridCells);
    });
}
