/**
 * Block Blast 游戏结束动画
 */

import gsap from 'gsap';

interface GameOverEffectParams {
    element: HTMLElement | null;
    onComplete?: () => void;
}

export const gameOverEffect = ({ element, onComplete }: GameOverEffectParams) => {
    if (!element) {
        onComplete?.();
        return;
    }

    const tl = gsap.timeline({
        onComplete: () => {
            onComplete?.();
        }
    });

    tl.to(element, {
        opacity: 1,
        visibility: 'visible',
        duration: 1,
        ease: 'power2.inOut'
    });

    return tl;
};

