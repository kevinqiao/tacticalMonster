/**

 * 单人纸牌游戏主入口组件

 * 基于 solitaire 的多人版本，简化为单人玩法

 */



import { ConvexProvider, ConvexReactClient } from 'convex/react';

import gsap from 'gsap';
import React, { useCallback, useRef } from 'react';
import GamePlayer from './GamePlayer';

import SoloGameProvider from './service/GameManager';

import SoloDnDProvider from './service/SoloDnDProvider';

import './style.css';

import { SoloGameConfig } from './types/SoloTypes';
import type { TriathlonMidSessionAdvanceHandler } from 'component/battle/games/shared/casualTriathlonSubmitFlow';



interface SoloGameProps {

    /** Casual 异步锦标模板 id */

    casualTournamentId?: string;

    /** `joinTournament` 返回的 match `gameId`（`game_${matchId}_${uid}`） */

    casualMatchGameId?: string;

    config?: Partial<SoloGameConfig>;

    className?: string;

    style?: React.CSSProperties;
    onGameSubmit?: () => void;
    onTriathlonNextGame?: TriathlonMidSessionAdvanceHandler;
}



/** Must match `CONVEX_URL` for `src/convex/solitaireArena` (`npx convex dev` from that folder). */
const convex_url =
    import.meta.env.VITE_CONVEX_URL_SOLITAIRE ?? "https://artful-chipmunk-59.convex.cloud";



const SoloGameInner: React.FC<Omit<SoloGameProps, 'className' | 'style'>> = ({

    casualTournamentId,

    casualMatchGameId,

    config,
    onGameSubmit,
    onTriathlonNextGame,
}) => {
    const loadingRef = useRef<HTMLDivElement | null>(null)
    const playerRef = useRef<HTMLDivElement | null>(null)
    const onGameLoadComplete = useCallback(() => {
        loadingRef.current?.classList.add('solo-game-loading--hidden');
        if (playerRef.current) {
            gsap.set(playerRef.current, { autoAlpha: 1 });
        }
        if (loadingRef.current) {
            gsap.to(loadingRef.current, {
                autoAlpha: 0,
                duration: 0.35,
                ease: 'power2.inOut',
            });
        }
    }, []);
    return (
        <>
            <div
                ref={playerRef}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            >
                <SoloGameProvider

                    config={config}

                    gameId={casualMatchGameId}

                    casualTournamentId={casualTournamentId}
                    onGameLoadComplete={onGameLoadComplete}

                    onGameSubmit={onGameSubmit}
                    onTriathlonNextGame={onTriathlonNextGame}
                >

                    {/* <EventProvider> */}

                    <SoloDnDProvider>

                        <GamePlayer onGameLoadComplete={onGameLoadComplete} />

                    </SoloDnDProvider>

                    {/* </EventProvider> */}

                </SoloGameProvider>
            </div>
            <div className="solo-game-loading" ref={loadingRef}>
                Loading Solo Game…
            </div>
        </>

    );

};



const SolitaireGame: React.FC<SoloGameProps> = ({

    casualTournamentId,

    casualMatchGameId,

    config,

    className = '',

    style,
    onGameSubmit,
    onTriathlonNextGame,
}) => {

    const client = React.useMemo(() => new ConvexReactClient(convex_url), []);



    return (

        <div className={`solo-game-container ${className}`.trim()} style={style}>

            <ConvexProvider client={client}>

                <SoloGameInner

                    casualTournamentId={casualTournamentId}

                    casualMatchGameId={casualMatchGameId}

                    config={config}

                    onGameSubmit={onGameSubmit}
                    onTriathlonNextGame={onTriathlonNextGame}
                />

            </ConvexProvider>

        </div>

    );

};



export default SolitaireGame;

