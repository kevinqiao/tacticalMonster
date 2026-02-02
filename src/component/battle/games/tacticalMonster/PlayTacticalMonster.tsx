import { api as tacticalMonsterApi } from "@/convex/tacticalMonster/convex/_generated/api";
import { api as tournamentApi } from "@/convex/tournament/convex/_generated/api";
import { URLS, useTournamentManager } from "@/service/TournamentManager";
import { useUserManager } from "@/service/UserManager";
import { ConvexClient, ConvexHttpClient } from "convex/browser";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { MatchStatus } from "../../MatchTypes";
import { PlayProps } from "../../PlayTournament";
import usePreGameAnimate from "./animation/usePreGameAnimate";
import BattlePlayer from "./battle/BattlePlayer";
import CombatManager from "./battle/service/CombatManager";

import "./styles.css";
import { TeamLayout3D } from "./team/threejs";
import { GameModel } from "./types/gameTypes";
import { Stage } from "./types/StageTypes";
interface Props {
    game: GameModel;
    mode: 'join' | 'play' | 'watch' | 'replay';
    initialPhaseChanges?: any; // ✅ 初始 phaseChanges
}

const PlayGame: React.FC<Props> = ({
    game,
    mode = 'play',  // ✅ 新增：默认 play 模式
    initialPhaseChanges, // ✅ 初始 phaseChanges
}) => {

    const client = React.useMemo(() => new ConvexReactClient(URLS.tacticalMonster), [URLS.tacticalMonster]);

    return (
        <div className="tactical-monster-game-container">
            <ConvexProvider client={client}>
                <CombatManager game={game} mode={mode === 'join' ? 'play' : mode} initialPhaseChanges={initialPhaseChanges}>
                    <BattlePlayer />
                </CombatManager>
            </ConvexProvider>
        </div>
    );
};
const PlayTacticalMonster: React.FC<PlayProps> = (props) => {

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
    const { playInit, openTeamLayout, playLoading, openPlayGame } = usePreGameAnimate(teamLayoutRef, loadingRef, playGameRef);

    const startJoin = useCallback(async () => {

        if (props.mode === "join" && props.typeId && props.stageId) {
            playLoading();
            const result = await joinTournament(props.typeId, props.stageId);
            if (result.ok && result.game) {
                setGame(result.game);
                // ✅ 保存 phaseChanges（如果存在）
                if (result.phaseChanges) {
                    setInitialPhaseChanges(result.phaseChanges);
                }
                openPlayGame();
            }
            console.log("join result", result);
        }
    }, [props]);

    useEffect(() => {

        if (!props.visible) {
            setGame(null);
            setInitialPhaseChanges(null); // ✅ 重置 phaseChanges
            loadingGameIdRef.current = null;
            playInit();
            return;
        }
        if (props.mode === "join") {
            openTeamLayout();
        } else {
            if (props.gameId && loadingGameIdRef.current !== props.gameId) {
                loadingGameIdRef.current = props.gameId;
                playLoading();
                tacticalMonsterClient.action(tacticalMonsterApi.service.tournament.tournamentService.loadGame, { uid: user?.uid, gameId: props.gameId }).then((res) => {
                    console.log("loadGame result", res);
                    if (res.ok) {
                        setGame(res.game);
                        // ✅ 保存 phaseChanges（如果存在）
                        if (res.phaseChanges) {
                            setInitialPhaseChanges(res.phaseChanges);
                        }
                        openPlayGame();
                    }
                });
            }
        }

    }, [props, user?.uid, tacticalMonsterClient]);
    useEffect(() => {
        // 使用 onUpdate 订阅数据更新
        if (!user?.uid || !tournamentClient || !tacticalMonsterClient || !props.visible) return;
        const unsubscribe = tournamentClient.onUpdate(
            tournamentApi.service.tournament.matchManager.findNewMatch,
            { uid: user?.uid },
            async (match) => {
                console.log("收到新:", match);
                if (!match) return;
                if (match.status === MatchStatus.OPEN) {
                    if (props.mode === "join" && props.matchType !== "solo") {
                        // 防止重复加载相同的 gameId
                        if (loadingGameIdRef.current !== match.gameId) {
                            loadingGameIdRef.current = match.gameId;
                            console.log("匹配成功", match);
                            tacticalMonsterClient.action(tacticalMonsterApi.service.tournament.tournamentService.loadGame, { uid: user?.uid, gameId: match.gameId }).then((res) => {
                                console.log("getPlayerMonsters result", res);
                                if (res.ok) {
                                    setGame(res.game);
                                    // ✅ 保存 phaseChanges（如果存在）
                                    if (res.phaseChanges) {
                                        setInitialPhaseChanges(res.phaseChanges);
                                    }
                                }
                            });
                        }
                    }
                }
            },
            (error) => {
                console.error("订阅错误:", error);
            }
        );
        return () => unsubscribe();

    }, [user, tournamentClient, props, tacticalMonsterClient]);

    useEffect(() => {
        if (!props.stageId) return;
        tacticalMonsterClient.query(tacticalMonsterApi.service.stage.stageManagerService.findStage, { stageId: props.stageId }).then((res) => {
            console.log("getStage result", res);
            if (res) {
                setStage(res);
            }
        });
    }, [props.stageId]);

    return <>
        <div ref={teamLayoutRef} className="team-layout-container">
            {props.visible && stage && <TeamLayout3D stage={stage} onComplete={startJoin} />}
        </div>
        <div ref={playGameRef} className="play-tactical-monster-container">
            {props.visible && game && <PlayGame game={game} mode={props.mode} initialPhaseChanges={initialPhaseChanges} />}
        </div>
        <div ref={loadingRef} className="play-tactical-monster-loading"><div className="play-tactical-monster-loading-text">Loading...</div></div>
    </>
};
export default PlayTacticalMonster;