/**
 * 路径高亮工具函数
 */

import gsap from "gsap";

/**
 * 高亮路径和目标位置
 */
export const highlightPath = (
    path: Array<{ x: number; y: number }>,
    gridCells: any[][],
    targetPos: { q: number; r: number }
) => {
    const targetCell = gridCells[targetPos.r]?.[targetPos.q];
    if (targetCell?.gridGround) {
        gsap.to(targetCell.gridGround, { fill: "#ffff00", autoAlpha: 0.6, duration: 0.2 });
    }
    path.forEach((pos, index) => {
        const cell = gridCells[pos.y]?.[pos.x];
        if (cell?.gridGround) {
            gsap.to(cell.gridGround, { fill: "#00ffff", autoAlpha: 0.4, duration: 0.1, delay: index * 0.05 });
        }
    });
};

/**
 * 清除路径高亮
 */
export const clearPathHighlight = (
    path: Array<{ x: number; y: number }>,
    gridCells: any[][],
    targetPos: { q: number; r: number }
) => {
    path.forEach(pos => {
        const cell = gridCells[pos.y]?.[pos.x];
        if (cell?.gridGround) gsap.set(cell.gridGround, { fill: "black", autoAlpha: 0.1 });
    });
    const targetCell = gridCells[targetPos.r]?.[targetPos.q];
    if (targetCell?.gridGround) gsap.set(targetCell.gridGround, { fill: "black", autoAlpha: 0.1 });
};

