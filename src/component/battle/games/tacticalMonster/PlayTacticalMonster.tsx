import { api as tacticalMonsterApi } from "@/convex/tacticalMonster/convex/_generated/api";
import { api as tournamentApi } from "@/convex/tournament/convex/_generated/api";
import { useUserManager } from "host/service/UserManager";
import { ConvexClient, ConvexHttpClient } from "convex/browser";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { PlayProps } from "../../PlayTournament";
import usePreGameAnimate from "./animation/usePreGameAnimate";
import BattlePlayer from "./battle/BattlePlayer";
import BattlePlayer3D from "./battle3d/BattlePlayer3D";
import CombatManager from "./service/CombatManager";

import { URLS, useTournamentManager } from "@/component/lobby/tactical/service/useTournamentManager";
import { GameData } from "../../PlayTournament";
import { getStageRuleConfig } from "./config/stageRuleConfigs";
import "./styles.css";
import { TeamLayout3D } from "./team3d";
import { GameModel } from "./types/gameTypes";
import { Stage } from "./types/StageTypes";

/** 教学关或显式 hideTeamLayout 时跳过编队界面（mode 以后端/锦标赛 config 为准） */
function shouldSkipTeamLayout(gameData: GameData): boolean {
    const { typeId, mode } = gameData;
    if (mode === "tutorial" || !typeId) return true;
    const rule = getStageRuleConfig(typeId);
    if (rule?.uiRules?.hideTeamLayout) return true;
    return false;
}

/** 设为 true 使用 3D 战斗视图，false 使用 2D */
const USE_3D_BATTLE = true;

interface Props {
    game: GameModel;
    playMode: 'play' | 'watch' | 'replay';
    initialPhaseChanges?: any; // ✅ 初始 phaseChanges
    exit?: () => void;
}

const PlayGame: React.FC<Props> = ({
    game,
    playMode = 'play',
    initialPhaseChanges,
    exit,
}) => {

    const client = React.useMemo(() => new ConvexReactClient(URLS.tacticalMonster), [URLS.tacticalMonster]);

    return (
        <div className="tactical-monster-game-container">
            <ConvexProvider client={client}>
                <CombatManager
                    key={game?.gameId ?? 'loading'}
                    game={game}
                    mode={playMode}
                    initialPhaseChanges={initialPhaseChanges}
                    exit={exit}
                >
                    {USE_3D_BATTLE ? <BattlePlayer3D /> : <BattlePlayer />}
                </CombatManager>
            </ConvexProvider>
        </div>
    );
};
const PlayTacticalMonster: React.FC<PlayProps> = ({ close, playMode = 'join', gameData }) => {

    const loadingRef = useRef<HTMLDivElement>(null);
    const teamLayoutRef = useRef<HTMLDivElement>(null);
    const playGameRef = useRef<HTMLDivElement>(null);
    const [stage, setStage] = useState<Stage | null>(null);
    const [game, setGame] = useState<GameModel | null>(null);
    const [initialPhaseChanges, setInitialPhaseChanges] = useState<any>(null); // ✅ 保存初始 phaseChanges
    const loadingGameIdRef = useRef<string | null>(null); // 防止重复加载
    const { user } = useUserManager();
    const { joinTournament } = useTournamentManager();
    const tournamentClient = React.useMemo(() => { return new ConvexClient(URLS.tournament) }, []);
    const tacticalMonsterClient = React.useMemo(() => { return new ConvexHttpClient(URLS.tacticalMonster) }, []);
    const { openTeamLayout, openPlayGame } = usePreGameAnimate(teamLayoutRef, loadingRef, playGameRef);


    const startJoin = useCallback(async () => {
        const { typeId, stageId } = gameData;

        if (typeId) {

            // playLoading();
            const result = await joinTournament(typeId, stageId || "");
            console.log("join result", result);
            if (
                result &&
                result.ok === true &&
                "game" in result &&
                result.game != null &&
                "phaseChanges" in result &&
                result.phaseChanges != null
            ) {
                const { game, phaseChanges } = result;
                loadingGameIdRef.current = game.gameId;
                setGame(game);
                setInitialPhaseChanges(phaseChanges);
                openPlayGame();
            } else {
                const errorCode =
                    result && "errorCode" in result ? result.errorCode : "UNKNOWN_JOIN_ERROR";
                console.error("[PlayTacticalMonster] join failed:", {
                    typeId: typeId,
                    stageId: stageId,
                    errorCode,
                    result,
                });

            }

        }
    }, [gameData, joinTournament, openPlayGame]);

    useEffect(() => {

        if (playMode === "join") {
            console.log("startJoin");
            if (shouldSkipTeamLayout(gameData)) {
                void startJoin();
            } else {
                openTeamLayout();
            }
        } else {
            const { game, phaseChanges } = gameData;
            if (game && phaseChanges) {
                loadingGameIdRef.current = game.gameId;
                setGame(game);
                setInitialPhaseChanges(phaseChanges);
                openPlayGame();
            }
        }

    }, [gameData, playMode, startJoin, openTeamLayout, openPlayGame]);

    /** join 且匹配异步落库时：订阅 OPEN 对局并 loadGame，与 startJoin 直返 game 互补 */
    useEffect(() => {
        if (!user?.uid || playMode !== "join" || gameData.mode !== "multiplayer_tournament") return;
        const sub = tournamentClient.onUpdate(
            tournamentApi.service.tournament.matchManager.findNewMatch,
            { uid: user.uid },
            (match) => {
                if (!match?.gameId) return;
                if (match.status !== "open") return;
                if (loadingGameIdRef.current === match.gameId) return;
                loadingGameIdRef.current = match.gameId;
                void tacticalMonsterClient
                    .action(tacticalMonsterApi.service.tournament.tournamentService.loadGame, {
                        gameId: match.gameId,
                    })
                    .then((res: any) => {
                        if (res?.ok && res.game) {
                            setGame(res.game);
                            if (res.phaseChanges) {
                                setInitialPhaseChanges(res.phaseChanges);
                            }
                            openPlayGame();
                        }
                    })
                    .catch((e) => console.error("[PlayTacticalMonster] loadGame (findNewMatch)", e));
            },
            (err) => console.error("[PlayTacticalMonster] findNewMatch onUpdate", err)
        );
        return () => sub.unsubscribe();
    }, [user?.uid, playMode, gameData, tournamentClient, tacticalMonsterClient, openPlayGame]);



    useEffect(() => {
        if (playMode !== "join" || shouldSkipTeamLayout(gameData)) {
            setStage(null);
            return;
        }
        const typeId = gameData?.typeId;
        if (!typeId || !user?.uid) {
            setStage(null);
            return;
        }

        let cancelled = false;
        setStage(null);

        void (async () => {
            try {
                if (gameData.stageId) {
                    const direct = await tacticalMonsterClient.query(
                        tacticalMonsterApi.service.stage.stageManagerService.findStage,
                        { stageId: gameData.stageId }
                    );
                    if (cancelled) return;
                    if (direct) {
                        setStage(direct);
                        return;
                    }
                }

                const ensured = await tacticalMonsterClient.mutation(
                    tacticalMonsterApi.service.stage.stageManagerService.ensureChallengeStageForPlay,
                    { uid: user.uid, typeId }
                );
                if (cancelled) return;
                if (ensured?.ok && ensured.stage) {
                    setStage(ensured.stage);
                } else {
                    console.error("[PlayTacticalMonster] ensureChallengeStageForPlay failed", ensured);
                }
            } catch (e) {
                console.error("[PlayTacticalMonster] load stage for team layout", e);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [playMode, gameData, user?.uid, tacticalMonsterClient]);

    return <>
        <div ref={teamLayoutRef} className="play-tactical-monster-container">
            {/* <div style={{ width: "100%", height: "100%", backgroundColor: "red" }}></div> */}
            {stage && <TeamLayout3D stage={stage} typeId={gameData.typeId} onComplete={startJoin} />}

        </div>
        <div ref={playGameRef} className="play-tactical-monster-container">
            {game && (
                <PlayGame
                    game={game}
                    playMode={playMode === 'join' ? 'play' : playMode as 'play' | 'watch' | 'replay'}
                    initialPhaseChanges={initialPhaseChanges}
                    exit={() => { console.log("exit"); close?.(); }}
                />
            )}
        </div>
        <div ref={loadingRef} className="play-tactical-monster-loading">
            <div className="play-tactical-monster-loading-text">
                Loading Tactical Monster...
            </div>
        </div>
    </>
};
export default PlayTacticalMonster;