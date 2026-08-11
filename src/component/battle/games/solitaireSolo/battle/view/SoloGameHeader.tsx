/**
 * 单人纸牌顶栏：中目标 / 右计时·分数·步数（对齐 Block Blast）
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import gsap from "gsap";
import { playTargetGoalIntro } from "../../../shared/targetGoalIntro";
import {
    CasualTargetStars,
    CasualTargetStarsIntroRows,
} from "../../../shared/CasualTargetStars";

function formatMatchRemainingSec(sec: number): string {
    const clamped = Math.max(0, Math.ceil(sec));
    const m = Math.floor(clamped / 60);
    const s = clamped % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

export interface SoloGameHeaderProps {
    displayScore: number | null;
    displayMoves: number | null;
    /** 休闲 run 绝对截止（epoch ms）；重载后仍准确 */
    dueTime?: number;
    /** 兼容：仅 clear-bar 时的单目标 */
    targetScore?: number;
    /** HUD 双档目标 */
    targetScoreP75?: number;
    targetScoreP90?: number;
    /** 开盘目标飞入动画按局去重 */
    gameKey?: string;
    /**
     * True while opening deal is pending/running — hold the target intro until
     * deal finishes so it does not overlap the cascade.
     */
    deferTargetIntro?: boolean;
    /** 倒计时归零时触发强制结束（与 useActHandler 定时器互为兜底） */
    onMatchTimeout?: () => void;
}

const SoloGameHeader: React.FC<SoloGameHeaderProps> = ({
    displayScore,
    displayMoves,
    dueTime,
    targetScore,
    targetScoreP75,
    targetScoreP90,
    gameKey = "",
    deferTargetIntro = false,
    onMatchTimeout,
}) => {
    const { t } = useTranslation("shared.casual");
    const [remainingSec, setRemainingSec] = useState<number | null>(null);
    const matchTimeoutFiredRef = useRef(false);
    const prevScoreRef = useRef<number | null>(null);
    const [scorePulse, setScorePulse] = useState(false);

    const targetSlotRef = useRef<HTMLSpanElement>(null);
    const flyRef = useRef<HTMLDivElement>(null);
    const introPlayedForRef = useRef<string | null>(null);
    const [targetSettled, setTargetSettled] = useState(false);
    const [introVisible, setIntroVisible] = useState(false);

    const hasDual =
        typeof targetScoreP75 === "number" &&
        Number.isFinite(targetScoreP75) &&
        typeof targetScoreP90 === "number" &&
        Number.isFinite(targetScoreP90);
    const hasSingle =
        !hasDual && typeof targetScore === "number" && Number.isFinite(targetScore);
    const hasTarget = hasDual || hasSingle;
    const introKey = hasDual
        ? `${gameKey}:p75=${targetScoreP75}:p90=${targetScoreP90}`
        : `${gameKey}:t=${targetScore}`;

    useEffect(() => {
        matchTimeoutFiredRef.current = false;
        if (dueTime == null || !Number.isFinite(dueTime)) {
            setRemainingSec(null);
            return;
        }
        const tick = () => {
            const sec = Math.max(0, (dueTime - Date.now()) / 1000);
            setRemainingSec(sec);
            if (sec <= 0 && onMatchTimeout && !matchTimeoutFiredRef.current) {
                matchTimeoutFiredRef.current = true;
                onMatchTimeout();
            }
        };
        tick();
        const id = window.setInterval(tick, 1000);
        return () => window.clearInterval(id);
    }, [dueTime, onMatchTimeout]);

    useEffect(() => {
        if (displayScore == null) {
            prevScoreRef.current = null;
            return;
        }
        const prev = prevScoreRef.current;
        prevScoreRef.current = displayScore;
        if (prev == null || prev === displayScore) return;
        setScorePulse(false);
        const raf = window.requestAnimationFrame(() => setScorePulse(true));
        const tid = window.setTimeout(() => setScorePulse(false), 420);
        return () => {
            window.cancelAnimationFrame(raf);
            window.clearTimeout(tid);
        };
    }, [displayScore]);

    useEffect(() => {
        introPlayedForRef.current = null;
        setTargetSettled(false);
        setIntroVisible(false);
    }, [gameKey]);

    useLayoutEffect(() => {
        if (!hasTarget) return;
        // 无 gameKey 时跳过飞入，直接显示（避免目标永久透明）
        if (!gameKey) {
            setTargetSettled(true);
            setIntroVisible(false);
            return;
        }
        if (introPlayedForRef.current === introKey) {
            setTargetSettled(true);
            setIntroVisible(false);
            return;
        }
        // Wait for opening deal to finish before flying the goal into the HUD.
        if (deferTargetIntro) {
            setTargetSettled(false);
            setIntroVisible(false);
            return;
        }
        const slotEl = targetSlotRef.current;
        const flyEl = flyRef.current;
        if (!slotEl || !flyEl) return;

        setTargetSettled(false);
        setIntroVisible(true);

        let finished = false;
        const rootEl = flyEl.parentElement;
        const tl = playTargetGoalIntro({
            flyEl,
            slotEl,
            rootEl,
            onComplete: () => {
                finished = true;
                introPlayedForRef.current = introKey;
                setTargetSettled(true);
                setIntroVisible(false);
            },
        });

        return () => {
            tl.kill();
            gsap.killTweensOf(flyEl);
            if (!finished) {
                setIntroVisible(false);
            }
        };
    }, [hasTarget, gameKey, introKey, deferTargetIntro]);

    const timerText =
        remainingSec != null ? formatMatchRemainingSec(remainingSec) : null;

    return (
        <>
            <header className="solo-game-header" aria-label={t("hud.matchInfoAria")}>
                <div className="solo-game-header__row">
                    <div className="solo-game-header__target-slot">
                        {hasDual ? (
                            <CasualTargetStars
                                ref={targetSlotRef}
                                className={
                                    targetSettled
                                        ? "solo-game-header__target-wrap--settled"
                                        : undefined
                                }
                                hudOpacity={targetSettled ? 1 : 0}
                                currentScore={displayScore ?? 0}
                                p75={targetScoreP75!}
                                p90={targetScoreP90!}
                                gameKey={gameKey}
                            />
                        ) : hasSingle ? (
                            <span
                                ref={targetSlotRef}
                                className={[
                                    "solo-game-header__target",
                                    targetSettled ? "solo-game-header__target--settled" : "",
                                ]
                                    .filter(Boolean)
                                    .join(" ")}
                                aria-label={t("hud.targetScoreAria")}
                                style={{ opacity: targetSettled ? 1 : 0 }}
                            >
                                <span className="solo-game-header__target-label">
                                    {t("hud.target")}
                                </span>
                                <span className="solo-game-header__target-value">
                                    {targetScore}
                                </span>
                            </span>
                        ) : null}
                    </div>

                    <div className="solo-game-header__side solo-game-header__side--right">
                        {timerText != null ? (
                            <time
                                className="solo-game-header__timer"
                                aria-label={t("hud.remainingTimeAria")}
                            >
                                {timerText}
                            </time>
                        ) : null}
                        <span
                            className={[
                                "solo-game-header__score-main",
                                scorePulse ? "solo-game-header__score-main--pulse" : "",
                            ]
                                .filter(Boolean)
                                .join(" ")}
                        >
                            {displayScore == null ? "—" : displayScore}
                        </span>
                        <div className="solo-game-header__secondary">
                            <span aria-label={t("hud.moves")}>
                                M{displayMoves == null ? "—" : displayMoves}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {hasTarget ? (
                <div
                    ref={flyRef}
                    className={[
                        "solo-target-intro",
                        hasDual ? "solo-target-intro--dual" : "",
                    ]
                        .filter(Boolean)
                        .join(" ")}
                    aria-hidden={!introVisible}
                    style={{ visibility: introVisible ? "visible" : "hidden" }}
                >
                    <span className="solo-target-intro__label">{t("hud.targetIntro")}</span>
                    {hasDual ? (
                        <CasualTargetStarsIntroRows
                            p75={targetScoreP75!}
                            p90={targetScoreP90!}
                        />
                    ) : (
                        <span className="solo-target-intro__value">{targetScore}</span>
                    )}
                </div>
            ) : null}
        </>
    );
};

export default SoloGameHeader;
