import { api as tacticalMonsterApi } from "@/convex/tacticalMonster/convex/_generated/api";
import { api as tournamentApi } from "@/convex/tournament/convex/_generated/api";
import { URLS, useTournamentManager } from "@/service/TournamentManager";
import { useUserManager } from "@/service/UserManager";
import { ConvexClient, ConvexHttpClient } from "convex/browser";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import gsap from "gsap";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { MatchStatus } from "../../MatchTypes";
import { PlayProps } from "../../PlayTournament";
import BattlePlayer from "./battle/BattlePlayer";
import CombatManager from "./battle/service/CombatManager";
import { GameModel } from "./battle/types/CombatTypes";
import "./styles.css";
import TeamLayout from "./TeamLayout";
interface Props {
    game: GameModel;
    mode: 'join' | 'play' | 'watch' | 'replay';
}

const PlayGame: React.FC<Props> = ({
    game,
    mode = 'play',  // ✅ 新增：默认 play 模式
}) => {

    const client = React.useMemo(() => new ConvexReactClient(URLS.tacticalMonster), [URLS.tacticalMonster]);
    const onGameSubmit = () => {
        console.log("game submit");
    };
    return (
        <div className="tactical-monster-game-container">
            <ConvexProvider client={client}>
                <CombatManager game={game} onGameSubmit={onGameSubmit}>
                    <BattlePlayer mode={mode} />
                </CombatManager>
            </ConvexProvider>
        </div>
    );
};
const PlayTacticalMonster: React.FC<PlayProps> = (props) => {

    const maskRef = useRef<HTMLDivElement>(null);
    const teamLayoutRef = useRef<HTMLDivElement>(null);
    const playGameRef = useRef<HTMLDivElement>(null);
    const [game, setGame] = useState<GameModel | null>(null);
    const { user } = useUserManager();
    const { joinTournament } = useTournamentManager();
    const tournamentClient = React.useMemo(() => { return new ConvexClient(URLS.tournament) }, []);
    const tacticalMonsterClient = React.useMemo(() => { return new ConvexHttpClient(URLS.tacticalMonster) }, []);

    const startJoin = useCallback(async () => {
        console.log("startJoin", props);
        if (props.mode === "join" && props.typeId && props.stageId) {
            const result = await joinTournament(props.typeId, props.stageId);
            if (result.ok && result.game) {
                setGame(result.game);
            }
            console.log("join result", result);
        }
    }, [props]);

    useEffect(() => {
        const tl = gsap.timeline();

        if (!game) {
            tl.to(teamLayoutRef.current, {
                autoAlpha: 1,
                duration: 0.5,
                ease: "power2.inOut"
            }, "<");
        } else {

            tl.to(teamLayoutRef.current, {
                autoAlpha: 0,
                duration: 1.5,
                ease: "power2.inOut"
            }, "<");
            tl.to(playGameRef.current, {
                autoAlpha: 1,
                duration: 1.5,
                ease: "power2.inOut",
            }, "<");

        }
        tl.play();
    }, [game]);
    useEffect(() => {
        // 使用 onUpdate 订阅数据更新
        if (!user?.uid || !tournamentClient || !tacticalMonsterClient) return;
        const unsubscribe = tournamentClient.onUpdate(
            tournamentApi.service.tournament.matchManager.findNewMatch,
            { uid: user?.uid },
            async (match) => {
                console.log("收到新:", match);
                if (!match) return;
                if (match.status === MatchStatus.OPEN) {
                    if (props.mode === "join" && props.matchType !== "solo") {
                        console.log("匹配成功", match);
                        tacticalMonsterClient.action(tacticalMonsterApi.service.tournament.tournamentService.loadGame, { uid: user?.uid, gameId: match.gameId }).then((res) => {
                            console.log("getPlayerMonsters result", res);
                            if (res.ok) {
                                setGame(res.game);
                            }
                        });
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
        if (props.mode === "play" && props.gameId) {
            tacticalMonsterClient.action(tacticalMonsterApi.service.tournament.tournamentService.loadGame, { uid: user?.uid, gameId: props.gameId }).then((res) => {
                console.log("loadGame result", res);
                if (res.ok) {
                    setGame(res.game);
                }
            });
        }
    }, [props]);

    return <>
        <div ref={maskRef} className="play-mask"></div>
        <div ref={teamLayoutRef} className="team-layout-container">
            {!game && props.stageId && <TeamLayout stageId={props.stageId} onComplete={startJoin} />}
        </div>
        <div ref={playGameRef} className="play-tactical-monster-container">
            {game && <PlayGame game={game} mode={props.mode} />}
        </div>
    </>
};
export default PlayTacticalMonster;