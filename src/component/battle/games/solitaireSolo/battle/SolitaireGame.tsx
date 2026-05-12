/**

 * 单人纸牌游戏主入口组件

 * 基于 solitaire 的多人版本，简化为单人玩法

 */



import { ConvexProvider, ConvexReactClient } from 'convex/react';

import React from 'react';

import GamePlayer from './GamePlayer';

import SoloGameProvider from './service/GameManager';

import SoloDnDProvider from './service/SoloDnDProvider';

import './style.css';

import { SoloGameConfig } from './types/SoloTypes';



interface SoloGameProps {

    /** 若省略，则使用 `casualMatchGameId` 或由客户端生成 id，再由 `loadGame` action 建局 */

    gameId?: string;

    /** Casual 异步锦标模板 id */

    casualTournamentId?: string;

    /** `joinTournament` 返回的 match `gameId`（`game_${matchId}_${uid}`） */

    casualMatchGameId?: string;

    config?: Partial<SoloGameConfig>;

    className?: string;

    style?: React.CSSProperties;

    onGameLoadComplete?: () => void;

    onGameSubmit?: () => void;

}



/** Must match `CONVEX_URL` for `src/convex/solitaireArena` (`npx convex dev` from that folder). */
const convex_url =
  import.meta.env.VITE_CONVEX_URL_SOLITAIRE ?? "https://artful-chipmunk-59.convex.cloud";



const SoloGameInner: React.FC<Omit<SoloGameProps, 'className' | 'style'>> = ({

    gameId: propGameId,

    casualTournamentId,

    casualMatchGameId,

    config,

    onGameLoadComplete,

    onGameSubmit,

}) => {

    const [activeGameId, setActiveGameId] = React.useState<string | undefined>(() =>

        propGameId ?? casualMatchGameId ?? undefined

    );



    React.useEffect(() => {

        if (propGameId) {

            setActiveGameId(propGameId);

            return;

        }

        if (casualMatchGameId) {

            setActiveGameId(casualMatchGameId);

            return;

        }

        setActiveGameId((prev) => prev ?? crypto.randomUUID());

    }, [propGameId, casualMatchGameId]);



    if (!activeGameId) {

        return (

            <div className="solo-game-container">

                Loading Solo Game…

            </div>

        );

    }



    return (

        <SoloGameProvider

            config={config}

            gameId={activeGameId}

            casualTournamentId={casualTournamentId}

            onGameLoadComplete={onGameLoadComplete}

            onGameSubmit={onGameSubmit}

        >

            {/* <EventProvider> */}

            <SoloDnDProvider>

                <GamePlayer gameId={activeGameId} />

            </SoloDnDProvider>

            {/* </EventProvider> */}

        </SoloGameProvider>

    );

};



const SolitaireGame: React.FC<SoloGameProps> = ({

    gameId,

    casualTournamentId,

    casualMatchGameId,

    config,

    className = '',

    style,

    onGameLoadComplete,

    onGameSubmit,

}) => {

    const client = React.useMemo(() => new ConvexReactClient(convex_url), []);



    return (

        <div className={`solo-game-container ${className}`.trim()} style={style}>

            <ConvexProvider client={client}>

                <SoloGameInner

                    gameId={gameId}

                    casualTournamentId={casualTournamentId}

                    casualMatchGameId={casualMatchGameId}

                    config={config}

                    onGameLoadComplete={onGameLoadComplete}

                    onGameSubmit={onGameSubmit}

                />

            </ConvexProvider>

        </div>

    );

};



export default SolitaireGame;

