/**
 * 拖拽高亮工具函数
 */

import { GridCellSprite } from "../../types/CombatTypes";

/**
 * 默认格子样式
 */
export const DEFAULT_CELL_STYLES = {
    fill: "black",
    stroke: "white",
    strokeWidth: "4",
    opacity: "0.4",
} as const;

/**
 * 高亮格子样式
 */
export const HIGHLIGHT_CELL_STYLES = {
    fill: "black",
    stroke: "yellow",
    strokeWidth: "4",
    opacity: "0.8",
} as const;

/**
 * 设置格子高亮
 */
export const setHighlight = (cell: GridCellSprite): void => {
    if (cell.element) {
        cell.element.style.fill = HIGHLIGHT_CELL_STYLES.fill;
        cell.element.style.stroke = HIGHLIGHT_CELL_STYLES.stroke;
        cell.element.style.strokeWidth = HIGHLIGHT_CELL_STYLES.strokeWidth;
        cell.element.style.opacity = HIGHLIGHT_CELL_STYLES.opacity;
    }
};

/**
 * 清除格子高亮
 */
export const clearHighlight = (cell: GridCellSprite): void => {
    if (cell.element) {
        cell.element.style.fill = DEFAULT_CELL_STYLES.fill;
        cell.element.style.stroke = DEFAULT_CELL_STYLES.stroke;
        cell.element.style.strokeWidth = DEFAULT_CELL_STYLES.strokeWidth;
        cell.element.style.opacity = DEFAULT_CELL_STYLES.opacity;
    }
};
