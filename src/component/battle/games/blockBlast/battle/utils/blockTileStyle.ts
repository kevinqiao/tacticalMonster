import type { CSSProperties } from 'react';

function clamp255(n: number): number {
    return Math.max(0, Math.min(255, Math.round(n)));
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
    const h = hex.replace('#', '');
    if (h.length !== 6) return null;
    return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
    };
}

function toHex(r: number, g: number, b: number): string {
    return `#${[r, g, b]
        .map((c) => clamp255(c).toString(16).padStart(2, '0'))
        .join('')}`;
}

function lighten(hex: string, t: number): string {
    const p = parseHex(hex);
    if (!p) return hex;
    return toHex(p.r + (255 - p.r) * t, p.g + (255 - p.g) * t, p.b + (255 - p.b) * t);
}

function darken(hex: string, t: number): string {
    const p = parseHex(hex);
    if (!p) return hex;
    return toHex(p.r * (1 - t), p.g * (1 - t), p.b * (1 - t));
}

/** 参考「Block Blaster」式：面心微鼓、左上高光、右下收影的塑料块 */
export function getBlockTileSurfaceStyle(baseHex: string): CSSProperties {
    const hi = lighten(baseHex, 0.24);
    const lo = darken(baseHex, 0.2);
    return {
        background: `linear-gradient(148deg, ${hi} 0%, ${baseHex} 45%, ${lo} 100%)`,
        boxShadow: `
            inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.45),
            inset -2px -2px 3px rgba(0, 0, 0, 0.3),
            0 1px 2px rgba(0, 0, 0, 0.2)
        `
            .replace(/\s+/g, ' ')
            .trim(),
        borderRadius: 6,
        border: '1px solid rgba(0, 0, 0, 0.12)',
    };
}

/** 空槽位：深色内凹，与彩块对比 */
export function getEmptyGridCellStyle(): CSSProperties {
    return {
        background: 'linear-gradient(168deg, #1a2a48 0%, #0f1a32 50%, #0a1224 100%)',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5), inset 0 -1px 0 rgba(255,255,255,0.05)',
        borderRadius: 6,
        border: '1px solid rgba(0, 0, 0, 0.4)',
    };
}
