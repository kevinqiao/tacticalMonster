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
    /** 拖拽起始会把原件设为 hidden；无幽灵分支必须恢复可见，否则会永久占位且后续命中错乱 */
    shape.ele.style.visibility = '';
    gsap.killTweensOf(shape.ele);
    gsap.to(shape.ele, {
        x: 0,
        y: 0,
        zIndex: 1,
        duration: 0.25,
        ease: 'back.out',
        onComplete: () => {
            if (shape?.ele) shape.ele.style.visibility = '';
            onComplete?.();
        },
    });
}
