/**
 * 单人纸牌顶栏：头像、昵称、分数、步数；可选「收到基础」紧挨分数。
 */

import type { User } from 'host/service/UserManager';
import { useUserManager } from 'host/service/UserManager';
import React, { useMemo } from 'react';

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

export interface SoloGameHeaderProps {
    displayScore: number | null;
    displayMoves: number | null;
    showAutoComplete: boolean;
    onAutoComplete: () => void;
}

const SoloGameHeader: React.FC<SoloGameHeaderProps> = ({
    displayScore,
    displayMoves,
    showAutoComplete,
    onAutoComplete,
}) => {
    const { user } = useUserManager();
    const avatarUrl = useMemo(() => avatarPhotoUrlFromUser(user as User | null), [user]);
    const playerLabel = useMemo(() => displayNameFromUser(user as User | null), [user]);

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
                        onClick={() => {
                            onAutoComplete();
                        }}
                    >
                        收到基础
                    </button>
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
            </div>
        </header>
    );
};

export default SoloGameHeader;
