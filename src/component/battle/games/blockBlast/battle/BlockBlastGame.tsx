/**
 * Block Blast 入口（对齐 solitaireSolo SolitaireGame：ConvexProvider、满高容器、loading 层）
 */
import { ConvexReactClient, useMutation } from 'convex/react';
import { markPortalGameplayReady } from 'host/service/ads/display/portalAdPhase';
import PlatformConvexProvider from 'host/service/platformAuth/PlatformConvexProvider';
import gsap from 'gsap';
import React, { useCallback, useRef } from 'react';
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
    const loadingRef = useRef<HTMLDivElement | null>(null);
    const playerRef = useRef<HTMLDivElement | null>(null);
    /** 与 Solitaire：`game_${matchId}_${uid}` 由 `proxy.controller.loadGame` action 从 casual 拉 seed 后建局，勿在此 mutation 重复 insert */
    const [activeGameId, setActiveGameId] = React.useState<string | undefined>(
        () => propGameId ?? casualMatchGameId ?? undefined
    );
    const [createError, setCreateError] = React.useState<string | null>(null);
    const createBlockBlastGame = useMutation(api.service.gameManager.createBlockBlastGame);

    const handleGameLoadComplete = useCallback(() => {
        loadingRef.current?.classList.add('blockblast-game-loading--hidden');
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
        markPortalGameplayReady();
        onGameLoadComplete?.();
    }, [onGameLoadComplete]);

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

    return (
        <>
            <div
                ref={playerRef}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            >
                {activeGameId && !createError ? (
                    <BlockBlastGameProvider
                        key={activeGameId}
                        config={config}
                        gameId={activeGameId}
                        casualTournamentId={casualTournamentId}
                        onGameLoadComplete={handleGameLoadComplete}
                        onGameSubmit={onGameSubmit}
                        onTriathlonNextGame={onTriathlonNextGame}
                    >
                        <BlockBlastDnDProvider>
                            <GamePlayer onGameLoadComplete={handleGameLoadComplete} />
                        </BlockBlastDnDProvider>
                    </BlockBlastGameProvider>
                ) : null}
            </div>
            <div
                className="blockblast-game-loading"
                ref={loadingRef}
                role={createError ? 'alert' : undefined}
            >
                {createError ?? 'Loading...'}
            </div>
        </>
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
            <PlatformConvexProvider client={client}>
                <BlockBlastGameInner
                    gameId={gameId}
                    casualTournamentId={casualTournamentId}
                    casualMatchGameId={casualMatchGameId}
                    config={config}
                    onGameLoadComplete={onGameLoadComplete}
                    onGameSubmit={onGameSubmit}
                    onTriathlonNextGame={onTriathlonNextGame}
                />
            </PlatformConvexProvider>
        </div>
    );
};

export default BlockBlastGame;
