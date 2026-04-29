import gsap from 'gsap';
import { Shape } from '../../types/BlockBlastTypes';

export function dragCancelShape({
    data,
    onComplete,
}: {
    data: { shape: Shape; dragGhostEl?: HTMLElement | null };
    onComplete?: () => void;
}) {
    const { shape, dragGhostEl } = data;

    if (dragGhostEl) {
        gsap.killTweensOf(dragGhostEl);
        gsap.to(dragGhostEl, {
            opacity: 0,
            duration: 0.18,
            ease: 'power2.out',
            onComplete: () => {
                dragGhostEl.remove();
                if (shape?.ele) shape.ele.style.visibility = '';
                onComplete?.();
            },
        });
        return;
    }

    if (!shape?.ele) {
        onComplete?.();
        return;
    }
    gsap.killTweensOf(shape.ele);
    gsap.to(shape.ele, {
        x: 0,
        y: 0,
        zIndex: 1,
        duration: 0.25,
        ease: 'back.out',
        onComplete: () => onComplete?.(),
    });
}
