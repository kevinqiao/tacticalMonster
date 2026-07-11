/**

 * 单人纸牌顶栏：分数、步数；P75 挑战可选目标分。

 */



import React, { useEffect, useState } from 'react';



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

    const [remainingSec, setRemainingSec] = useState<number | null>(null);

    const matchTimeoutFiredRef = React.useRef(false);

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



    return (

        <header className="solo-game-header" aria-label="对局信息">

            <div className="solo-game-header__stats">

                <div className="solo-game-header__score-row">

                    {targetScore != null ? (

                        <div className="solo-game-header__stat">

                            <span className="solo-game-header__stat-label">目标</span>

                            <span className="solo-game-header__stat-value">{targetScore}</span>

                        </div>

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


