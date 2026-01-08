import { useTournamentManager } from "@/service/TournamentManager";
import { ConvexReactClient } from "convex/react";
import gsap from "gsap";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { PlayTournamentProps } from "../../PlayTournament";
import "./styles.css";
import TeamLayout from "./TeamLayout";
interface Props {
    gameId: string;
    mode: 'play' | 'watch' | 'replay';
}
const convex_url = "https://artful-chipmunk-59.convex.cloud";
const PlayGame: React.FC<Props> = ({
    gameId,
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
            Play Game
            {/* <ConvexProvider client={client}>
                <CombatManager gameId={gameId} onGameLoadComplete={handleLoadComplete} onGameSubmit={onGameSubmit}>
                    <BattlePlayer gameId={gameId} mode={mode} />
                </CombatManager>
            </ConvexProvider> */}
        </div>
    );
};
const PlayTacticalMonster: React.FC<PlayTournamentProps> = (props) => {
    // console.log("play tactical monster", gameType, typeId, stageId);
    const maskRef = useRef<HTMLDivElement>(null);
    const teamLayoutRef = useRef<HTMLDivElement>(null);
    const playGameRef = useRef<HTMLDivElement>(null);
    const [gameId, setGameId] = useState<string | undefined>(props.gameId);

    const { monsters, joinTournament } = useTournamentManager();

    const startJoin = useCallback(async () => {
        setGameId("test-game-id");
        // if (props.typeId && props.stageId) {
        //     const result = await joinTournament(props.typeId, props.stageId);
        //     console.log("join result", result);
        // }
    }, [props]);
    useEffect(() => {
        const tl = gsap.timeline();

        if (!gameId) {
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
    }, [gameId]);
    return <>
        <div ref={maskRef} className="play-mask"></div>
        <div ref={teamLayoutRef} className="team-layout-container">
            {!gameId && props.stageId && <TeamLayout stageId={props.stageId} onComplete={startJoin} />}
        </div>
        <div ref={playGameRef} className="play-tactical-monster-container">
            {gameId && <PlayGame gameId={gameId} mode={props.playMode} />}
        </div>
    </>
};
export default PlayTacticalMonster;