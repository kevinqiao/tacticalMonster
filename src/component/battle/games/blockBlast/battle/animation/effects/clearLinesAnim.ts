import gsap from 'gsap';
import { BLOCK_BLAST_ANIMATION_CONFIG } from '../animationConfig';

interface ClearLinesAnimParams {
    rows: number[];
    cols: number[];
    gridCellRefs: (HTMLDivElement | null)[][];
    onComplete?: () => void;
}

const { duration, clear: clearCfg } = BLOCK_BLAST_ANIMATION_CONFIG;

function collectClearedElements(
    rows: number[],
    cols: number[],
    gridCellRefs: (HTMLDivElement | null)[][]
): HTMLElement[] {
    const targets: HTMLElement[] = [];
    for (const row of rows) {
        for (let c = 0; c < 10; c++) {
            const el = gridCellRefs[row]?.[c];
            if (el) targets.push(el);
        }
    }
    for (const col of cols) {
        for (let r = 0; r < 10; r++) {
            const el = gridCellRefs[r]?.[col];
            if (el) targets.push(el);
        }
    }
    return [...new Set(targets)];
}

/**
 * 消除行/列：先高亮脉冲，再缩小+淡出，最后清掉 GSAP 行内样式（避免影响重绘后的空槽）
 */
export function clearLinesAnim({ rows, cols, gridCellRefs, onComplete }: ClearLinesAnimParams) {
    const unique = collectClearedElements(rows ?? [], cols ?? [], gridCellRefs);
    if (unique.length === 0) {
        onComplete?.();
        return;
    }

    const stagger = clearCfg.stagger;
    const done = () => {
        gsap.set(unique, { clearProps: 'transform,opacity,filter,boxShadow' });
        onComplete?.();
    };

    const tl = gsap.timeline({ onComplete: done });
    tl.to(unique, {
        scale: 1.12,
        boxShadow: '0 0 16px rgba(255,255,255,0.95), 0 0 6px rgba(150,220,255,0.9), inset 0 0 8px rgba(255,255,255,0.5)',
        filter: 'brightness(1.35) saturate(1.2)',
        duration: duration.clearFlash,
        ease: 'power2.out',
        stagger,
    }).to(unique, {
        scale: 0.15,
        opacity: 0,
        boxShadow: 'none',
        filter: 'brightness(1.5) blur(4px)',
        duration: duration.clearVanish,
        ease: 'power3.in',
        stagger,
    });
    return tl;
}
