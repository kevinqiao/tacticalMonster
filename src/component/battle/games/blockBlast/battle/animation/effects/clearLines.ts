/**
 * Block Blast 清除行/列动画
 */

import gsap from 'gsap';

interface ClearLinesEffectParams {
    rows: number[];
    cols: number[];
    gridCells: HTMLDivElement[][];
    onComplete?: () => void;
}

export const clearLinesEffect = ({ rows, cols, gridCells, onComplete }: ClearLinesEffectParams) => {
    const tl = gsap.timeline({
        onComplete: () => {
            onComplete?.();
        }
    });

    // 清除行的动画
    rows.forEach((row, index) => {
        gridCells[row].forEach((cell) => {
            if (cell) {
                tl.to(cell, {
                    scale: 0,
                    opacity: 0,
                    duration: 0.2,
                    ease: 'power2.in',
                }, index * 0.05);
            }
        });
    });

    // 清除列的动画
    cols.forEach((col, index) => {
        for (let row = 0; row < 10; row++) {
            const cell = gridCells[row]?.[col];
            if (cell) {
                tl.to(cell, {
                    scale: 0,
                    opacity: 0,
                    duration: 0.2,
                    ease: 'power2.in',
                }, (rows.length * 0.05) + (index * 0.05));
            }
        }
    });

    // 重置动画
    tl.set([...rows.map(row => gridCells[row]), ...cols.map(col => Array.from({ length: 10 }, (_, row) => gridCells[row][col]))].flat(), {
        scale: 1,
        opacity: 1,
    });

    return tl;
};

