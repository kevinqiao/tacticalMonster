/**

 * 单人纸牌游戏主入口组件

 * 基于 solitaire 的多人版本，简化为单人玩法

 */



import { ConvexReactClient } from 'convex/react';
import { markPortalGameplayReady } from 'host/service/ads/display/portalAdPhase';
import PlatformConvexProvider from 'host/service/platformAuth/PlatformConvexProvider';

import gsap from 'gsap';
import React, { useCallback, useLayoutEffect, useRef } from 'react';
import GamePlayer from './GamePlayer';

import SoloGameProvider from './service/GameManager';

import SoloDnDProvider from './service/SoloDnDProvider';
import SoloActHandlerProvider from './service/handler/SoloActHandlerProvider';

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
    // Hide board until load/deal reveal — prevents a dealt flash under Loading.
    useLayoutEffect(() => {
        if (playerRef.current) {
            gsap.set(playerRef.current, { autoAlpha: 0 });
        }
    }, []);
    const onGameLoadComplete = useCallback(() => {
        // Cross-fade only — do NOT set visibility:hidden up front (that pops Loading
        // off in one frame and reads as a full-screen flash when the board appears).
        if (playerRef.current) {
            gsap.set(playerRef.current, { autoAlpha: 1 });
        }
        const loadingEl = loadingRef.current;
        if (loadingEl) {
            gsap.to(loadingEl, {
                autoAlpha: 0,
                duration: 0.28,
                ease: 'power2.inOut',
                onComplete: () => {
                    loadingEl.classList.add('solo-game-loading--hidden');
                    // Banner/chrome phase change can resize the stage — run after the
                    // fade so it does not coincide with the first deal paint.
                    markPortalGameplayReady();
                },
            });
        } else {
            markPortalGameplayReady();
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

                    <SoloActHandlerProvider>
                        <SoloDnDProvider>
                            <GamePlayer onGameLoadComplete={onGameLoadComplete} />
                        </SoloDnDProvider>
                    </SoloActHandlerProvider>

                    {/* </EventProvider> */}

                </SoloGameProvider>
            </div>
            <div className="solo-game-loading" ref={loadingRef}>
                Loading...
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

            <PlatformConvexProvider client={client}>

                <SoloGameInner

                    casualTournamentId={casualTournamentId}

                    casualMatchGameId={casualMatchGameId}

                    config={config}

                    onGameSubmit={onGameSubmit}
                    onTriathlonNextGame={onTriathlonNextGame}
                />

            </PlatformConvexProvider>

        </div>

    );

};



export default SolitaireGame;

