/**
 * 单人纸牌顶栏：分数、步数；P75 挑战可选目标分。分数变化时数字轻跳（飘字在棋盘落点）。
 */

import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

function formatMatchRemainingSec(sec: number): string {
    const clamped = Math.max(0, Math.floor(sec));
    const m = Math.floor(clamped / 60);
    const s = clamped % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

export interface SoloGameHeaderProps {
    displayScore: number | null;
    displayMoves: number | null;
    /** 休闲 run 绝对截止（epoch ms）；重载后仍准确 */
    dueTime?: number;
    /** P75 挑战：本局 seed 分位目标分 */
    targetScore?: number;
    /** 倒计时归零时触发强制结束（与 useActHandler 定时器互为兜底） */
    onMatchTimeout?: () => void;
}

const SoloGameHeader: React.FC<SoloGameHeaderProps> = ({
    displayScore,
    displayMoves,
    dueTime,
    targetScore,
    onMatchTimeout,
}) => {
    const { t } = useTranslation("shared.casual");
    const [remainingSec, setRemainingSec] = useState<number | null>(null);
    const matchTimeoutFiredRef = useRef(false);
    const prevScoreRef = useRef<number | null>(null);
    const [scorePulse, setScorePulse] = useState(false);

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
        setScorePulse(true);
        const t = window.setTimeout(() => setScorePulse(false), 280);
        return () => window.clearTimeout(t);
    }, [displayScore]);

    return (
        <header className="solo-game-header" aria-label={t("hud.matchInfoAria")}>
            <div className="solo-game-header__stats">
                <div className="solo-game-header__score-row">
                    {targetScore != null ? (
                        <div className="solo-game-header__stat">
                            <span className="solo-game-header__stat-label">{t("hud.target")}</span>
                            <span className="solo-game-header__stat-value">{targetScore}</span>
                        </div>
                    ) : null}
                    <div className="solo-game-header__stat solo-game-header__stat--score">
                        <span className="solo-game-header__stat-label">{t("hud.score")}</span>
                        <span
                            className={
                                scorePulse
                                    ? "solo-game-header__stat-value solo-game-header__stat-value--pulse"
                                    : "solo-game-header__stat-value"
                            }
                        >
                            {displayScore == null ? "—" : displayScore}
                        </span>
                    </div>
                </div>
                <div className="solo-game-header__stat">
                    <span className="solo-game-header__stat-label">{t("hud.moves")}</span>
                    <span className="solo-game-header__stat-value">
                        {displayMoves == null ? "—" : displayMoves}
                    </span>
                </div>
                {remainingSec != null ? (
                    <div className="solo-game-header__stat">
                        <span className="solo-game-header__stat-label">{t("hud.remaining")}</span>
                        <span className="solo-game-header__stat-value">
                            {formatMatchRemainingSec(remainingSec)}
                        </span>
                    </div>
                ) : null}
            </div>
        </header>
    );
};

export default SoloGameHeader;
