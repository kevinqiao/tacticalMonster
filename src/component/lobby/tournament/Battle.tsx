import { PageProp } from "component/RenderApp";
import BattlePlayer from "component/solitaire/battle/BattlePlayer";
import { GameModel } from "component/solitaire/battle/types/CombatTypes";
import { useConvex } from "convex/react";
import gsap from "gsap";
import React, { useCallback, useEffect, useRef, useState } from "react";
import SSAProvider from "service/SSAManager";
import { api } from "../../../convex/solitaire/convex/_generated/api";
import "./style.css";
interface MatchProp {
  stageReady?: boolean;
  matchId: string | undefined;
  onMatchComplete: () => void;
  onMatchCancel: () => void;
  onLoadComplete?: () => void;
}


const PlaySolitaire: React.FC<MatchProp> = ({ matchId, onLoadComplete }) => {
  const loadRef = useRef<HTMLDivElement>(null);
  const playRef = useRef<HTMLDivElement>(null);
  const convex = useConvex();
  const [game, setGame] = useState<GameModel | undefined>(undefined);
  const [renderReady, setRenderReady] = useState(false);

  const onRenderComplete = useCallback(() => {
    const tl = gsap.timeline();
    tl.to(loadRef.current, { autoAlpha: 0, duration: 2 }).to(playRef.current, { autoAlpha: 1, duration: 2 }, "<");
    tl.play();
  }, []);

  useEffect(() => {
    const load = async (matchId: string) => {
      const gameObj = await convex.query(api.dao.gameDao.findMatchGame, { matchId });
      if (gameObj !== null) {
        setGame(gameObj as GameModel);
        onLoadComplete?.();
      }
    }
    if (matchId) {
      load(matchId);
    }
  }, [matchId])

  // useEffect(() => {
  //   if (game) {
  //     if (openFull) {
  //       openFull().then(() => {
  //         setRenderReady(true);
  //       });
  //     } else {
  //       setRenderReady(true);
  //     }
  //   }
  // }, [game])

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div id="game-load" ref={loadRef} className="game-loading">
        Loading Game...
      </div>
      <div id="game-play" ref={playRef} className="game-play">
        {game && renderReady && <BattlePlayer game={game} onRenderComplete={onRenderComplete} />}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "absolute", bottom: 0, right: 0, width: 100, height: 40, backgroundColor: "red", color: "white" }} onClick={close}>
          close
        </div>
      </div>
    </div>
  );
};
const SolitaireMatch: React.FC<MatchProp> = ({ matchId, onLoadComplete, onMatchComplete, onMatchCancel }) => {

  return (
    <SSAProvider app="solitaire">
      <PlaySolitaire matchId={matchId} onLoadComplete={onLoadComplete} onMatchComplete={onMatchComplete} onMatchCancel={onMatchCancel} />
    </SSAProvider>
  );
};

const Battle: React.FC<PageProp> = ({ data, openFull, close }) => {
  const [stageReady, setStageReady] = useState(false);
  console.log("Battle", data);
  const onMatchComplete = useCallback(() => {
    console.log("onMatchComplete");
    close?.();
  }, []);
  const onMatchCancel = useCallback(() => {
    console.log("onMatchCancel");
    close?.();
  }, []);
  const onLoadComplete = useCallback(async () => {
    console.log("onLoadComplete");
    await openFull?.();
    setStageReady(true);
  }, [openFull]);
  return (
    <SolitaireMatch matchId={data?.matchId} stageReady={stageReady} onLoadComplete={onLoadComplete} onMatchComplete={onMatchComplete} onMatchCancel={onMatchCancel} />
  );
};
export default Battle;
