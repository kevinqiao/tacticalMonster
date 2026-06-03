/**
 * 单人纸牌顶栏：头像、昵称、分数、步数；可选「收到基础」紧挨分数。
 */

import type { User } from 'host/service/UserManager';
import { useUserManager } from 'host/service/UserManager';
import React, { useEffect, useMemo, useState } from 'react';

function avatarPhotoUrlFromUser(u: User | null): string | undefined {
    if (!u) return undefined;
    const d = (u.data ?? null) as Record<string, unknown> | null;
    const raw = d?.['imageUrl'] ?? d?.['avatar'] ?? d?.['picture'] ?? d?.['photoUrl'];
    if (typeof raw === 'string' && raw.trim().length > 0) {
        return raw.trim();
    }
    const uAny = u as { picture?: string; imageUrl?: string; avatar?: string };
    for (const v of [uAny.picture, uAny.imageUrl, uAny.avatar]) {
        if (typeof v === 'string' && v.trim().length > 0) return v.trim();
    }
    return undefined;
}

function displayNameFromUser(u: User | null): string {
    if (!u) return '玩家';
    if (typeof u.name === 'string' && u.name.trim()) return u.name.trim();
    if (typeof u.email === 'string' && u.email.trim()) return u.email.trim();
    return '玩家';
}

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
    showAutoComplete: boolean;
    onAutoComplete: () => void;
    /** 主动结束本局并按当前分数触发上报（锦标 / proxy） */
    onEndGame?: () => void;
    endGameDisabled?: boolean;
}

const SoloGameHeader: React.FC<SoloGameHeaderProps> = ({
    displayScore,
    displayMoves,
    dueTime,
    showAutoComplete,
    onAutoComplete,
    onEndGame,
    endGameDisabled,
}) => {
    const { user } = useUserManager();
    const avatarUrl = useMemo(() => avatarPhotoUrlFromUser(user as User | null), [user]);
    const playerLabel = useMemo(() => displayNameFromUser(user as User | null), [user]);

    const [remainingSec, setRemainingSec] = useState<number | null>(null);
    useEffect(() => {
        if (dueTime == null || !Number.isFinite(dueTime)) {
            setRemainingSec(null);
            return;
        }
        const tick = () => {
            setRemainingSec(Math.max(0, (dueTime - Date.now()) / 1000));
        };
        tick();
        const id = window.setInterval(tick, 1000);
        return () => window.clearInterval(id);
    }, [dueTime]);

    return (
        <header className="solo-game-header" aria-label="对局信息">
            <div className="solo-game-header__player">
                <div className="solo-game-header__avatar" aria-hidden>
                    {avatarUrl ? (
                        <img
                            className="solo-game-header__avatar-img"
                            src={avatarUrl}
                            alt=""
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <span className="solo-game-header__avatar-fallback" aria-hidden>
                            {playerLabel.slice(0, 1).toUpperCase()}
                        </span>
                    )}
                </div>
                <div className="solo-game-header__meta">
                    <span className="solo-game-header__name">{playerLabel}</span>
                </div>
            </div>
            <div className="solo-game-header__stats">
                <div className="solo-game-header__score-row">
                    <button
                        type="button"
                        className="solo-game-header__autocomplete"
                        aria-label="自动将可收牌全部收到基础堆"
                        disabled={!showAutoComplete}
                        onClick={() => {
                            onAutoComplete();
                        }}
                    >
                        收到基础
                    </button>
                    {onEndGame ? (
                        <button
                            type="button"
                            className="solo-game-header__end-game"
                            aria-label="以当前分数结束本局并结算"
                            disabled={endGameDisabled}
                            onClick={() => {
                                onEndGame();
                            }}
                        >
                            结束并结算
                        </button>
                    ) : null}
                    <div className="solo-game-header__stat">
                        <span className="solo-game-header__stat-label">分数</span>
                        <span className="solo-game-header__stat-value">
                            {displayScore == null ? '—' : displayScore}
                        </span>
                    </div>
                </div>
                <div className="solo-game-header__stat">
                    <span className="solo-game-header__stat-label">步数</span>
                    <span className="solo-game-header__stat-value">
                        {displayMoves == null ? '—' : displayMoves}
                    </span>
                </div>
                {remainingSec != null ? (
                    <div className="solo-game-header__stat">
                        <span className="solo-game-header__stat-label">剩余</span>
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
