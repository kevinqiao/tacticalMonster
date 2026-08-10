/**
 * Solo HUD：P75=★ / P90=★★★，达标高亮 + 飘字提示（不终局）。
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import gsap from "gsap";
import "./casualTargetStars.css";

export type CasualTargetTier = "p75" | "p90";

function StarGlyphs({ count }: { count: 1 | 3 }) {
    return (
        <span className="casual-target-stars__glyphs" aria-hidden>
            {Array.from({ length: count }, (_, i) => (
                <span key={i} className="casual-target-stars__star">
                    ★
                </span>
            ))}
        </span>
    );
}

export function CasualTargetStarsIntroRows({
    p75,
    p90,
}: {
    p75: number;
    p90: number;
}) {
    return (
        <div className="casual-target-stars-intro">
            <span className="casual-target-stars-intro__row">
                <span className="casual-target-stars-intro__glyphs">★</span>
                <span className="casual-target-stars-intro__value">{p75}</span>
            </span>
            <span className="casual-target-stars-intro__row">
                <span className="casual-target-stars-intro__glyphs">★★★</span>
                <span className="casual-target-stars-intro__value">{p90}</span>
            </span>
        </div>
    );
}

export type CasualTargetStarsProps = {
    currentScore: number;
    p75: number;
    p90: number;
    gameKey: string;
    /** 顶栏槽位可见度（开盘飞入未落定时为 0；庆祝层不受此影响） */
    hudOpacity?: number;
    className?: string;
};

function findCelebrateRoot(el: HTMLElement): HTMLElement {
    const host = el.closest(
        ".blockblast-player-container, .solo-player-container, .match3-game-container, .yatz-layout"
    );
    if (host instanceof HTMLElement) return host;
    if (el.offsetParent instanceof HTMLElement) return el.offsetParent;
    return el.parentElement ?? el;
}

function assignRef<T>(ref: React.ForwardedRef<T>, value: T | null) {
    if (typeof ref === "function") ref(value);
    else if (ref) ref.current = value;
}

export const CasualTargetStars = React.forwardRef<HTMLSpanElement, CasualTargetStarsProps>(
    function CasualTargetStars(
        { currentScore, p75, p90, gameKey, hudOpacity = 1, className },
        forwardedRef
    ) {
        const { t } = useTranslation("shared.casual");
        const slotRef = useRef<HTMLSpanElement | null>(null);
        const [reachedP75, setReachedP75] = useState(false);
        const [reachedP90, setReachedP90] = useState(false);
        const [popP75, setPopP75] = useState(false);
        const [popP90, setPopP90] = useState(false);
        const [celebrate, setCelebrate] = useState<CasualTargetTier | null>(null);
        const [celebrateRoot, setCelebrateRoot] = useState<HTMLElement | null>(null);
        const celebrateElRef = useRef<HTMLDivElement>(null);
        const prevScoreRef = useRef(0);
        const scorePrimedRef = useRef(false);

        const setSlotNode = (node: HTMLSpanElement | null) => {
            slotRef.current = node;
            assignRef(forwardedRef, node);
            setCelebrateRoot(node ? findCelebrateRoot(node) : null);
        };

        useEffect(() => {
            setReachedP75(false);
            setReachedP90(false);
            setPopP75(false);
            setPopP90(false);
            setCelebrate(null);
            prevScoreRef.current = 0;
            scorePrimedRef.current = false;
        }, [gameKey]);

        useEffect(() => {
            const score = Math.max(0, Math.floor(currentScore));
            if (!scorePrimedRef.current) {
                // 首帧只同步高亮，避免重载中途开局误触发飘字
                scorePrimedRef.current = true;
                prevScoreRef.current = score;
                if (score >= p75) setReachedP75(true);
                if (score >= p90) setReachedP90(true);
                return;
            }

            const prev = prevScoreRef.current;
            prevScoreRef.current = score;

            const crossP75 = prev < p75 && score >= p75;
            const crossP90 = prev < p90 && score >= p90;

            if (score >= p75) setReachedP75(true);
            if (score >= p90) setReachedP90(true);

            if (crossP90) {
                setPopP90(true);
                setCelebrate("p90");
            } else if (crossP75) {
                setPopP75(true);
                setCelebrate("p75");
            }
        }, [currentScore, p75, p90]);

        useEffect(() => {
            if (!popP75) return;
            const id = window.setTimeout(() => setPopP75(false), 560);
            return () => window.clearTimeout(id);
        }, [popP75]);

        useEffect(() => {
            if (!popP90) return;
            const id = window.setTimeout(() => setPopP90(false), 560);
            return () => window.clearTimeout(id);
        }, [popP90]);

        useLayoutEffect(() => {
            const el = celebrateElRef.current;
            const root = celebrateRoot;
            if (!celebrate || !el || !root) return;

            const rr = root.getBoundingClientRect();
            gsap.killTweensOf(el);
            gsap.set(el, {
                position: "absolute",
                left: 0,
                top: 0,
                x: rr.width / 2,
                y: rr.height * 0.38,
                xPercent: -50,
                yPercent: -50,
                scale: 0.7,
                autoAlpha: 0,
                zIndex: 42,
            });

            const tl = gsap.timeline({
                onComplete: () => {
                    setCelebrate(null);
                },
            });
            tl.to(el, {
                autoAlpha: 1,
                scale: 1.15,
                duration: 0.28,
                ease: "back.out(1.8)",
            })
                .to(el, { scale: 1.05, duration: 0.55, ease: "sine.inOut" })
                .to(el, {
                    autoAlpha: 0,
                    scale: 0.92,
                    y: "-=24",
                    duration: 0.35,
                    ease: "power2.in",
                });

            return () => {
                tl.kill();
                gsap.killTweensOf(el);
            };
        }, [celebrate, celebrateRoot]);

        return (
            <>
                <span
                    ref={setSlotNode}
                    className={["casual-target-stars", className].filter(Boolean).join(" ")}
                    style={{ opacity: hudOpacity }}
                    aria-label={t("hud.targetDualAria", { p75, p90 })}
                >
                    <span
                        className={[
                            "casual-target-stars__row",
                            reachedP75 ? "casual-target-stars__row--reached" : "",
                            popP75 ? "casual-target-stars__row--pop" : "",
                        ]
                            .filter(Boolean)
                            .join(" ")}
                        aria-label={t("hud.targetStar1Aria", { score: p75 })}
                    >
                        <StarGlyphs count={1} />
                        <span className="casual-target-stars__value">{p75}</span>
                    </span>
                    <span
                        className={[
                            "casual-target-stars__row",
                            reachedP90 ? "casual-target-stars__row--reached" : "",
                            popP90 ? "casual-target-stars__row--pop" : "",
                        ]
                            .filter(Boolean)
                            .join(" ")}
                        aria-label={t("hud.targetStar3Aria", { score: p90 })}
                    >
                        <StarGlyphs count={3} />
                        <span className="casual-target-stars__value">{p90}</span>
                    </span>
                </span>

                {celebrate && celebrateRoot
                    ? createPortal(
                          <div
                              ref={celebrateElRef}
                              className="casual-target-stars-celebrate"
                              aria-live="polite"
                          >
                              <span className="casual-target-stars-celebrate__stars">
                                  {celebrate === "p90" ? "★★★" : "★"}
                              </span>
                              <span className="casual-target-stars-celebrate__label">
                                  {celebrate === "p90"
                                      ? t("hud.targetReachedStars3")
                                      : t("hud.targetReachedStars1")}
                              </span>
                          </div>,
                          celebrateRoot
                      )
                    : null}
            </>
        );
    }
);
