/**
 * 开盘目标提示：中心大号展示 → 飞入顶栏中央槽位。
 */
import gsap from "gsap";

export type TargetGoalIntroParams = {
    flyEl: HTMLElement;
    slotEl: HTMLElement;
    /** 相对定位根（player container）；缺省用 flyEl.offsetParent */
    rootEl?: HTMLElement | null;
    onComplete?: () => void;
};

function centerOf(el: HTMLElement, root: HTMLElement): { x: number; y: number } {
    const er = el.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    return {
        x: er.left - rr.left + er.width / 2,
        y: er.top - rr.top + er.height / 2,
    };
}

export function playTargetGoalIntro({
    flyEl,
    slotEl,
    rootEl,
    onComplete,
}: TargetGoalIntroParams): gsap.core.Timeline {
    const root =
        rootEl ??
        (flyEl.offsetParent instanceof HTMLElement ? flyEl.offsetParent : flyEl.parentElement);
    if (!root) {
        onComplete?.();
        return gsap.timeline();
    }

    const rootRect = root.getBoundingClientRect();
    const startX = rootRect.width / 2;
    const startY = rootRect.height * 0.42;
    const end = centerOf(slotEl, root);

    gsap.killTweensOf(flyEl);
    gsap.set(flyEl, {
        position: "absolute",
        left: 0,
        top: 0,
        x: startX,
        y: startY,
        xPercent: -50,
        yPercent: -50,
        scale: 1.15,
        autoAlpha: 0,
        zIndex: 40,
        pointerEvents: "none",
    });

    const tl = gsap.timeline({
        onComplete: () => {
            onComplete?.();
        },
    });

    tl.to(flyEl, {
        autoAlpha: 1,
        scale: 1.35,
        duration: 0.35,
        ease: "back.out(1.6)",
    })
        .to(flyEl, {
            scale: 1.45,
            duration: 0.28,
            yoyo: true,
            repeat: 1,
            ease: "sine.inOut",
        })
        .to(flyEl, {
            x: end.x,
            y: end.y,
            scale: 1,
            duration: 0.55,
            ease: "power3.inOut",
        })
        .to(flyEl, {
            autoAlpha: 0,
            duration: 0.18,
            ease: "power1.in",
        });

    return tl;
}
