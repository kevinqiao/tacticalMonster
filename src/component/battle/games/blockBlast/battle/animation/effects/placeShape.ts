/**
 * Block Blast 放置形状动画
 */

import gsap from 'gsap';
import { Shape } from '../../types/BlockBlastTypes';

interface PlaceShapeEffectParams {
    shape: Shape;
    position: { row: number, col: number };
    onComplete?: () => void;
}

export const placeShapeEffect = ({ shape, position, onComplete }: PlaceShapeEffectParams) => {
    if (!shape.ele) {
        onComplete?.();
        return;
    }

    const tl = gsap.timeline({
        onComplete: () => {
            onComplete?.();
        }
    });

    // 放置动画：从当前位置移动到目标位置
    tl.to(shape.ele, {
        scale: 1.1,
        duration: 0.1,
        ease: 'power2.out',
    }).to(shape.ele, {
        scale: 1,
        duration: 0.2,
        ease: 'power2.in',
    });

    return tl;
};

