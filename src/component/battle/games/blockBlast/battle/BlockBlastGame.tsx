/**
 * Block Blast 入口（对齐 solitaireSolo SoloGame：ConvexProvider、可选 createBlockBlastGame 建局）
 */
import { ConvexProvider, ConvexReactClient, useMutation } from 'convex/react';
import React from 'react';
import { api } from '../../../../../convex/blockBlast/convex/_generated/api';
import GamePlayer from './GamePlayer';
import BlockBlastDnDProvider from './service/BlockBlastDnDProvider';
import BlockBlastGameProvider from './service/GameManager';
import './style.css';
import { BlockBlastGameConfig, normalizeBlockBlastGridSize } from './types/BlockBlastTypes';

import type { TriathlonMidSessionAdvanceHandler } from 'component/battle/games/shared/casualTriathlonSubmitFlow';

interface BlockBlastGameProps {
    gameId?: string;
    /** 若设置，局末在 Block Blast 原有上报之外调用 casualPlatform `submitScore`（Phase A） */
    casualTournamentId?: string;
    casualMatchGameId?: string;
    config?: Partial<BlockBlastGameConfig>;
    className?: string;
    style?: React.CSSProperties;
    onGameLoadComplete?: () => void;
    onGameSubmit?: () => void;
    onTriathlonNextGame?: TriathlonMidSessionAdvanceHandler;
}

/** Must match `CONVEX_URL` in `src/convex/blockBlast/.env.local` after `npx convex dev`. */
const convex_url =
    import.meta.env.VITE_CONVEX_URL_BLOCKBLAST ?? 'https://spotted-marten-367.convex.cloud';

type CreateResult = { ok: true; gameId: string } | { ok: false };

const BlockBlastGameInner: React.FC<Omit<BlockBlastGameProps, 'className' | 'style'>> = ({
    gameId: propGameId,
    casualTournamentId,
    casualMatchGameId,
    config,
    onGameLoadComplete,
    onGameSubmit,
    onTriathlonNextGame,
}) => {
    /** 与 Solitaire：`game_${matchId}_${uid}` 由 `proxy.controller.loadGame` action 从 casual 拉 seed 后建局，勿在此 mutation 重复 insert */
    const [activeGameId, setActiveGameId] = React.useState<string | undefined>(
        () => propGameId ?? casualMatchGameId ?? undefined
    );
    const [createError, setCreateError] = React.useState<string | null>(null);
    const createBlockBlastGame = useMutation(api.service.gameManager.createBlockBlastGame);

    React.useEffect(() => {
        if (propGameId) {
            setActiveGameId(propGameId);
            setCreateError(null);
            return;
        }
        if (casualMatchGameId) {
            setActiveGameId(casualMatchGameId);
            setCreateError(null);
            return;
        }
        let cancelled = false;
        setCreateError(null);
        (async () => {
            try {
                const gridSizeArg = config?.gridSize;
                const res = (await createBlockBlastGame({
                    ...(gridSizeArg !== undefined ? { gridSize: normalizeBlockBlastGridSize(gridSizeArg) } : {}),
                })) as CreateResult & { gameId?: string };
                if (cancelled) return;
                if (res?.ok && typeof res.gameId === 'string') {
                    setActiveGameId(res.gameId);
                } else {
                    setCreateError('Failed to create game');
                }
            } catch (e) {
                if (!cancelled) {
                    console.error(e);
                    setCreateError(e instanceof Error ? e.message : 'createBlockBlastGame failed');
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [propGameId, casualMatchGameId, createBlockBlastGame, config?.gridSize]);

    if (createError) {
        return (
            <div className="blockblast-game-container" role="alert">
                {createError}
            </div>
        );
    }

    if (!activeGameId) {
        return (
            <div className="blockblast-game-container">
                Loading Block Blast…
            </div>
        );
    }

    return (
        <BlockBlastGameProvider
            config={config}
            gameId={activeGameId}
            casualTournamentId={casualTournamentId}
            onGameLoadComplete={onGameLoadComplete}
            onGameSubmit={onGameSubmit}
            onTriathlonNextGame={onTriathlonNextGame}
        >
            <BlockBlastDnDProvider>
                <GamePlayer />
            </BlockBlastDnDProvider>
        </BlockBlastGameProvider>
    );
};

const BlockBlastGame: React.FC<BlockBlastGameProps> = ({
    gameId,
    casualTournamentId,
    casualMatchGameId,
    config,
    className = '',
    style,
    onGameLoadComplete,
    onGameSubmit,
    onTriathlonNextGame,
}) => {
    const client = React.useMemo(() => new ConvexReactClient(convex_url), []);

    return (
        <div className={`blockblast-game-container ${className}`.trim()} style={style}>
            <ConvexProvider client={client}>
                <BlockBlastGameInner
                    gameId={gameId}
                    casualTournamentId={casualTournamentId}
                    casualMatchGameId={casualMatchGameId}
                    config={config}
                    onGameLoadComplete={onGameLoadComplete}
                    onGameSubmit={onGameSubmit}
                    onTriathlonNextGame={onTriathlonNextGame}
                />
            </ConvexProvider>
        </div>
    );
};

export default BlockBlastGame;
