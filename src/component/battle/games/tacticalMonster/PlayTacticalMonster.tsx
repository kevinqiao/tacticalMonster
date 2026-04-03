import { api as tacticalMonsterApi } from "@/convex/tacticalMonster/convex/_generated/api";
import { api as tournamentApi } from "@/convex/tournament/convex/_generated/api";
import { URLS, useTournamentManager } from "@/service/TournamentManager";
import { useUserManager } from "@/service/UserManager";
import { ConvexClient, ConvexHttpClient } from "convex/browser";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { PlayProps } from "../../PlayTournament";
import usePreGameAnimate from "./animation/usePreGameAnimate";
import BattlePlayer from "./battle/BattlePlayer";
import BattlePlayer3D from "./battle3d/BattlePlayer3D";
import CombatManager from "./service/CombatManager";

import { GameData } from "../../PlayTournament";
import { getStageRuleConfig } from "./config/stageRuleConfigs";
import "./styles.css";
import TeamLayout3D from "./team3d/TeamLayout3D";
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
    console.log("PlayGame props", game, playMode, initialPhaseChanges);
    const client = React.useMemo(() => new ConvexReactClient(URLS.tacticalMonster), [URLS.tacticalMonster]);

    return (
        <div className="tactical-monster-game-container">
            <ConvexProvider client={client}>
                <CombatManager
                    key={game?.gameId ?? 'loading'}
                    game={game}
                    mode={playMode}
                    initialPhaseChanges={initialPhaseChanges}
                >
                    {USE_3D_BATTLE ? <BattlePlayer3D close={exit} /> : <BattlePlayer />}
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
    const { playInit, openTeamLayout, openPlayGame } = usePreGameAnimate(teamLayoutRef, loadingRef, playGameRef);


    const startJoin = useCallback(async () => {
        const { typeId, stageId } = gameData;

        if (typeId) {

            // playLoading();
            const result = await joinTournament(typeId, stageId || "");
            console.log("join result", result);
            if (result.ok && result.game) {
                loadingGameIdRef.current = result.game.gameId;
                setGame(result.game);
                // ✅ 保存 phaseChanges（如果存在）
                if (result.phaseChanges) {
                    setInitialPhaseChanges(result.phaseChanges);
                }
                openPlayGame();
            } else {
                const errorCode = result?.errorCode || "UNKNOWN_JOIN_ERROR";
                console.error("[PlayTacticalMonster] join failed:", {
                    typeId: typeId,
                    stageId: stageId,
                    errorCode,
                    result,
                });

            }

        }
    }, [gameData, joinTournament, openPlayGame, playInit]);

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
        if (!gameData || !gameData.stageId) return;
        tacticalMonsterClient.query(tacticalMonsterApi.service.stage.stageManagerService.findStage, { stageId: gameData.stageId }).then((res) => {
            console.log("getStage result", res);
            if (res) {
                setStage(res);
            }
        });
    }, [gameData]);

    return <>
        <div ref={teamLayoutRef} className="team-layout-container">
            {stage && <TeamLayout3D stage={stage} onComplete={startJoin} />}
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
                Loading Game...
            </div>
        </div>
    </>
};
export default PlayTacticalMonster;