/**
 * TurnOrderBar GSAP 动画 Hook
 * 替代 CSS transition + onTransitionEnd，支持 playbackSpeed 同步
 */

import gsap from "gsap";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

const EXIT_DURATION = 0.65;
const REAPPEAR_DURATION = 0.35;

export interface UseTurnOrderBarAnimationsOptions {
    exitingKeys: Set<string>;
    reappearingKeys: Set<string>;
    setExitingKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
    setReappearingKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
    itemWidth: number;
    gap: number;
    playbackSpeed?: number;
    roundNo?: number;
}

export function useTurnOrderBarAnimations(options: UseTurnOrderBarAnimationsOptions) {
    const {
        exitingKeys,
        reappearingKeys,
        setExitingKeys,
        setReappearingKeys,
        itemWidth,
        gap,
        playbackSpeed = 1.0,
        roundNo,
    } = options;

    const itemRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
    const activeTimelinesRef = useRef<gsap.core.Timeline[]>([]);
    const animatingExit = useRef<Set<string>>(new Set());
    const animatingReappear = useRef<Set<string>>(new Set());
    const timelineRef = useRef<gsap.core.Timeline | null>(null);

    useEffect(() => {
        if (roundNo === undefined) return;
        activeTimelinesRef.current.forEach((tl) => tl.kill());
        activeTimelinesRef.current = [];
        animatingExit.current.clear();
        animatingReappear.current.clear();
        itemRefsMap.current.clear();
    }, [roundNo]);

    const registerItemRef = useCallback((key: string, el: HTMLDivElement | null) => {
        if (el) {
            itemRefsMap.current.set(key, el);
        } else {
            itemRefsMap.current.delete(key);
        }
    }, []);

    useLayoutEffect(() => {
        if (exitingKeys.size === 0) return;

        const keysToAnimate = [...exitingKeys].filter((k) => !animatingExit.current.has(k));
        if (keysToAnimate.length === 0) return;

        keysToAnimate.forEach((key) => animatingExit.current.add(key));

        const timeScale = Math.max(0.1, playbackSpeed);
        const tl = gsap.timeline({ timeScale });

        keysToAnimate.forEach((key) => {
            const wrapperEl = itemRefsMap.current.get(key);
            const innerEl = wrapperEl?.querySelector("[data-turn-inner]") as HTMLElement | undefined;
            if (!wrapperEl) {
                animatingExit.current.delete(key);
                return;
            }

            gsap.set(wrapperEl, { width: itemWidth, minWidth: itemWidth, marginRight: gap });
            if (innerEl) gsap.set(innerEl, { xPercent: 0, scale: 1, opacity: 1 });

            tl.to(
                wrapperEl,
                {
                    width: 0,
                    minWidth: 0,
                    marginRight: 0,
                    duration: EXIT_DURATION,
                    ease: "power2.inOut",
                    overwrite: true,
                },
                "<"
            );

            if (innerEl) {
                tl.to(
                    innerEl,
                    {
                        xPercent: -180,
                        scale: 0.85,
                        opacity: 0,
                        duration: EXIT_DURATION * 0.85,
                        ease: "power2.in",
                    },
                    "<"
                );
            }
        });

        tl.add(() => {
            keysToAnimate.forEach((key) => animatingExit.current.delete(key));
            setExitingKeys((s) => {
                const next = new Set(s);
                keysToAnimate.forEach((k) => next.delete(k));
                return next;
            });
            setReappearingKeys((s) => {
                const next = new Set(s);
                keysToAnimate.forEach((k) => next.add(k));
                return next;
            });
        }, EXIT_DURATION);

        timelineRef.current = tl;
        activeTimelinesRef.current.push(tl);
        return () => {
            tl.kill();
            activeTimelinesRef.current = activeTimelinesRef.current.filter((t) => t !== tl);
            keysToAnimate.forEach((k) => animatingExit.current.delete(k));
        };
    }, [exitingKeys, setExitingKeys, setReappearingKeys, playbackSpeed, itemWidth, gap]);

    useEffect(() => {
        if (reappearingKeys.size === 0) return;

        const keysToAnimate = [...reappearingKeys].filter((k) => !animatingReappear.current.has(k));
        if (keysToAnimate.length === 0) return;

        const timeScale = Math.max(0.1, playbackSpeed);
        const tl = gsap.timeline({ timeScale });

        keysToAnimate.forEach((key) => animatingReappear.current.add(key));

        keysToAnimate.forEach((key) => {
            const wrapperEl = itemRefsMap.current.get(key);
            const innerEl = wrapperEl?.querySelector("[data-turn-inner]") as HTMLElement | undefined;
            if (!wrapperEl) {
                animatingReappear.current.delete(key);
                return;
            }

            gsap.set(wrapperEl, { width: 0, minWidth: 0, marginRight: 0 });
            if (innerEl) gsap.set(innerEl, { xPercent: -180, scale: 0.85, opacity: 0 });

            tl.to(
                wrapperEl,
                {
                    width: itemWidth,
                    minWidth: itemWidth,
                    marginRight: gap,
                    duration: REAPPEAR_DURATION,
                    ease: "power2.out",
                    overwrite: true,
                },
                "<"
            );

            if (innerEl) {
                tl.to(
                    innerEl,
                    {
                        xPercent: 0,
                        scale: 1,
                        opacity: 1,
                        duration: REAPPEAR_DURATION,
                        ease: "power2.out",
                    },
                    "<"
                );
            }
        });

        tl.add(() => {
            keysToAnimate.forEach((k) => animatingReappear.current.delete(k));
            setReappearingKeys((s) => {
                const next = new Set(s);
                keysToAnimate.forEach((k) => next.delete(k));
                return next;
            });
        }, REAPPEAR_DURATION);

        activeTimelinesRef.current.push(tl);
        return () => {
            tl.kill();
            activeTimelinesRef.current = activeTimelinesRef.current.filter((t) => t !== tl);
            keysToAnimate.forEach((k) => animatingReappear.current.delete(k));
        };
    }, [reappearingKeys, setReappearingKeys, itemWidth, gap, playbackSpeed]);

    return { registerItemRef };
}
