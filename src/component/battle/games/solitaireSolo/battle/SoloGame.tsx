/**
 * 单人纸牌游戏主入口组件
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

import { ConvexProvider, ConvexReactClient, useMutation } from 'convex/react';
import React from 'react';
import { api } from '../../../../../convex/solitaireArena/convex/_generated/api';
import GamePlayer from './GamePlayer';
import SoloGameProvider from './service/GameManager';
import SoloDnDProvider from './service/SoloDnDProvider';
import './style.css';
import { SoloGameConfig } from './types/SoloTypes';

interface SoloGameProps {
    /** 若省略，则在挂载时通过 Convex `createSoloGame` 创建新局并写入 gameId */
    gameId?: string;
    config?: Partial<SoloGameConfig>;
    className?: string;
    style?: React.CSSProperties;
    onGameLoadComplete?: () => void;
    onGameSubmit?: () => void;
}

const convex_url = "https://artful-chipmunk-59.convex.cloud";

type CreateSoloResult =
    | { ok: true; gameId: string }
    | { ok: false };

const SoloGameInner: React.FC<Omit<SoloGameProps, 'className' | 'style'>> = ({
    gameId: propGameId,
    config,
    onGameLoadComplete,
    onGameSubmit,
}) => {
    const [activeGameId, setActiveGameId] = React.useState<string | undefined>(() => propGameId);
    const [createError, setCreateError] = React.useState<string | null>(null);
    const createSoloGame = useMutation(api.service.gameManager.createSoloGame);

    React.useEffect(() => {
        if (propGameId) {
            setActiveGameId(propGameId);
            setCreateError(null);
            return;
        }
        let cancelled = false;
        setCreateError(null);
        (async () => {
            try {
                const res = (await createSoloGame({})) as CreateSoloResult & { gameId?: string };
                if (cancelled) return;
                if (res?.ok && typeof res.gameId === 'string') {
                    setActiveGameId(res.gameId);
                } else {
                    setCreateError('Failed to create game');
                }
            } catch (e) {
                if (!cancelled) {
                    console.error(e);
                    setCreateError(e instanceof Error ? e.message : 'createSoloGame failed');
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [propGameId, createSoloGame]);

    if (createError) {
        return (
            <div className="solo-game-container" role="alert">
                {createError}
            </div>
        );
    }

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

const SoloGame: React.FC<SoloGameProps> = ({
    gameId,
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
                    config={config}
                    onGameLoadComplete={onGameLoadComplete}
                    onGameSubmit={onGameSubmit}
                />
            </ConvexProvider>
        </div>
    );
};

export default SoloGame;
