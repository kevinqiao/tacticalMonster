import { useTournamentManager } from "@/service/TournamentManager";
import { useUserManager } from "@/service/UserManager";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import gsap from "gsap";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { PlayTournamentProps } from "../../PlayTournament";
import BattlePlayer from "./battle/BattlePlayer";
import CombatManager from "./battle/service/CombatManager";
import { GameModel } from "./battle/types/CombatTypes";
import "./styles.css";
import TeamLayout from "./TeamLayout";
interface Props {
    game: GameModel;
    mode: 'play' | 'watch' | 'replay';
}
const convex_url = "https://content-spider-446.convex.cloud";
const PlayGame: React.FC<Props> = ({
    game,
    mode = 'play',  // ✅ 新增：默认 play 模式
}) => {

    const client = React.useMemo(() => new ConvexReactClient(convex_url), [convex_url]);
    const handleLoadComplete = () => {
        console.log("game load complete");
    };
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
const PlayTacticalMonster: React.FC<PlayTournamentProps> = (props) => {
    // console.log("play tactical monster", gameType, typeId, stageId);
    const maskRef = useRef<HTMLDivElement>(null);
    const teamLayoutRef = useRef<HTMLDivElement>(null);
    const playGameRef = useRef<HTMLDivElement>(null);
    const [needMatching, setNeedMatching] = useState(false);
    const [game, setGame] = useState<GameModel | null>(null);
    const { joinTournament } = useTournamentManager();
    const { user } = useUserManager();
    const startJoin = useCallback(async () => {

        if (props.typeId && props.stageId) {
            const result = await joinTournament(props.typeId, props.stageId);
            if (result.ok && result.game) {
                setGame(result.game);
            }
            console.log("join result", result);
        }
    }, [props]);
    // 加载游戏
    // useEffect(() => {
    //     if (!game) return;

    //     const fetchGame = async (gameId: string) => {
    //         console.log("loading game", gameId);
    //         try {
    //             const gameObj = await convex.query((api as any).service.game.gameService.loadGame, { gameId });
    //             if (gameObj?.ok && gameObj.data) {
    //                 const gameData = gameObj.data;

    //                 // 更新现有角色的UI相关字段映射（用于在重新加载时保留）
    //                 if (game?.team && game?.boss) {
    //                     const existingCharacters = getCharactersFromGameModel(game.team, game.boss, existingSpritesRef.current);
    //                     existingCharacters.forEach(char => {
    //                         existingSpritesRef.current.set(char.character_id, char);
    //                     });
    //                 }

    //                 // 转换地图数据
    //                 const mapModel: MapModel = {
    //                     rows: gameData.map?.rows || 7,
    //                     cols: gameData.map?.cols || 8,
    //                     direction: (gameData.map as any)?.direction,
    //                     obstacles: gameData.map?.obstacles?.map((obs: { q: number; r: number }) => ({
    //                         q: obs.q,
    //                         r: obs.r,
    //                         asset: "",
    //                         walkable: false,
    //                         type: 1
    //                     })),
    //                     disables: gameData.map?.disables || []
    //                 };

    //                 // 构建前端 GameModel（扩展后端 GameModel）
    //                 setGame({
    //                     // 后端 GameModel 字段
    //                     gameId: gameData.gameId,
    //                     matchId: gameData.matchId,
    //                     stageId: gameData.stageId,
    //                     uid: gameData.uid,
    //                     teamPower: gameData.teamPower,
    //                     team: gameData.team,
    //                     boss: gameData.boss,
    //                     map: mapModel,  // 使用前端 MapModel 格式
    //                     status: gameData.status,
    //                     score: gameData.score || 0,
    //                     scoringConfigVersion: gameData.scoringConfigVersion,
    //                     lastUpdate: gameData.lastUpdate,
    //                     createdAt: gameData.createdAt,
    //                     round: gameData.round,
    //                     // 前端扩展字段
    //                     currentRound: gameData.currentRound || defaultRound,
    //                     timeClock: 0,
    //                 });

    //                 // setScore(gameData.score || 0);
    //                 // setLastTime(gameData.lastUpdate ? new Date(gameData.lastUpdate).getTime() : undefined);
    //                 // eventQueueRef.current.push({
    //                 //     name: "gameInit",
    //                 //     data: gameData,
    //                 //     status: 0,
    //                 //     gameId,
    //                 //     time: Date.now()
    //                 // });
    //                 // onGameLoadComplete?.();
    //             }
    //         } catch (error) {
    //             console.error("Failed to load game", error);
    //         }
    //     };

    //     fetchGame(gameId);
    // }, [game, user]);
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
    return <>
        <div ref={maskRef} className="play-mask"></div>
        <div ref={teamLayoutRef} className="team-layout-container">
            {!game && props.stageId && <TeamLayout stageId={props.stageId} onComplete={startJoin} />}
        </div>
        <div ref={playGameRef} className="play-tactical-monster-container">
            {game && <PlayGame game={game} mode={props.playMode} />}
        </div>
    </>
};
export default PlayTacticalMonster;