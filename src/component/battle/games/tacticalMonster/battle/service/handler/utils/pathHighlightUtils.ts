/**
 * 路径高亮工具函数
 */

import gsap from "gsap";

/**
 * 高亮路径和目标位置
 */
export const highlightPath = (
    path: Array<{ q: number; r: number }>,
    gridCells: any[][],
    targetPos: { q: number; r: number }
) => {
    const targetCell = gridCells[targetPos.r]?.[targetPos.q];
    if (targetCell?.element) {
        gsap.to(targetCell.element, { backgroundColor: "#ffff00", opacity: 0.6, duration: 0.2 });
    }
    path.forEach((pos, index) => {
        const cell = gridCells[pos.r]?.[pos.q];
        if (cell?.element) {
            gsap.to(cell.element, { backgroundColor: "#00ffff", opacity: 0.4, duration: 0.1, delay: index * 0.05 });
        }
    });
};

/**
 * 清除路径高亮
 */
export const clearPathHighlight = (
    path: Array<{ q: number; r: number }>,
    gridCells: any[][],
    targetPos: { q: number; r: number }
) => {
    path.forEach(pos => {
        const cell = gridCells[pos.r]?.[pos.q];
        if (cell?.element) gsap.set(cell.element, { opacity: 0.1 });
    });
    const targetCell = gridCells[targetPos.r]?.[targetPos.q];
    if (targetCell?.element) gsap.set(targetCell.element, { opacity: 0.1 });
};

