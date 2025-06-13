import { BattleProp } from "component/lobby/tournament/PlayMatch";
import { GameModel } from "component/solitaire/battle/types/CombatTypes";
import { useConvex } from "convex/react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../convex/solitaire/convex/_generated/api";
import { SSAProvider } from "../../../service/SSAManager";
import ActControl from "./control/ActControl";
import CombatEventControl from "./control/CombatEventControl";
import SkillControl from "./control/SkillControl";
import CombatProvider, { useCombatManager } from "./service/CombatManager";
import CombatSkillProvider from "./service/CombatSkillProvider";
import { SpriteProvider } from "./service/SpriteProvider";
import "./style.css";
import { createDualZones } from "./utils";
import CardGrid from "./view/CardGrid";
import SlotGrid from "./view/SlotGrid";
import SpriteGrid from "./view/SpriteGrid";

const CombatBoard: React.FC = () => {
  return <>
    <div style={{ width: "100%", height: "100%" }}>
      <SlotGrid />
      <CardGrid />
      <ActControl />
      <SkillControl />
      <SpriteGrid />
    </div></>

};

export const BattlePlaza: React.FC<{ onComplete: () => void; onGiveIn: () => void }> = ({ onComplete, onGiveIn }) => {

  const containerRef = useRef<HTMLDivElement | null>(null);
  const { boardDimension, updateBoardDimension } = useCombatManager();


  useEffect(() => {
    const updatePosition = () => {

      if (containerRef.current) {
        const { x, y, top, left, width, height } = containerRef.current.getBoundingClientRect();
        // console.log("x", x, "y", y, "top", top, "left", left, "width", width, "height", height);
        const boardDimension = { width: 0, height: 0, top: 0, left: 0, zones: {} }
        if (width / height > 0.9) {
          boardDimension.width = height * 0.9
          boardDimension.height = height
          boardDimension.top = 0;
          boardDimension.left = (width - height * 0.9) / 2
        } else {
          boardDimension.width = width;
          boardDimension.height = width / 0.9
          boardDimension.top = (height - width / 0.9) / 2
          boardDimension.left = 0
        }
        // const zones = getDualBoardZones(boardDimension.width, boardDimension.height);
        createDualZones(boardDimension);
        updateBoardDimension(boardDimension);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);

    return () => window.removeEventListener("resize", updatePosition);
  }, []);


  const render = useMemo(() => {
    return <>
      {<div ref={containerRef} className="battle-container" style={{ width: "100%", height: "100%" }}  >
        <div id="left-panel" style={{ position: "absolute", top: 0, left: 0, width: boardDimension?.left, height: "100%" }}></div>
        <div id="right-panel" style={{ position: "absolute", top: 0, right: 0, width: boardDimension?.left, height: "100%" }}></div>
        <div style={{
          position: "absolute", top: "50%", left: "50%", width: boardDimension?.width, height: boardDimension?.height, backgroundColor: "white", transform: "translate(-50%, -50%)"
        }} >
          <CombatBoard />
          <div className="command-container-bg">
            <div className="command-container">
              <div className="command-btn">Confirm</div>
              <div className="command-btn" onClick={onGiveIn}>Give In</div>
            </div>
          </div>
        </div >
      </div>
      }
    </>
  }, [boardDimension]);

  return render;
};
const GamePlayer: React.FC<BattleProp> = ({ matchId, stageReady, onLoadComplete, onRenderComplete, onComplete, onGiveIn }) => {

  const convex = useConvex();
  const [game, setGame] = useState<GameModel | undefined>(undefined);

  useEffect(() => {
    const loadGame = async () => {
      if (matchId) {
        const gameObj = await convex.query(api.dao.gameDao.findMatchGame, { matchId });
        console.log("gameObj", gameObj);
        setGame(gameObj as GameModel);
        onLoadComplete();
      }
    }

    loadGame();

  }, [matchId]);
  return (
    <>
      {
        game && stageReady &&
        <>
          <SpriteProvider onSpritesLoaded={() => {
            onRenderComplete?.();
          }}>
            <CombatProvider game={game}>
              <CombatSkillProvider>
                <BattlePlaza onComplete={onComplete} onGiveIn={onGiveIn} />
                <CombatEventControl />
              </CombatSkillProvider>
            </CombatProvider>
          </SpriteProvider>

        </>
      }</>
  )
};
const BattlePlayer: React.FC<BattleProp> = ({ matchId, stageReady, onLoadComplete, onRenderComplete, onComplete, onGiveIn }) => {

  return (
    <SSAProvider app="solitaire">
      <GamePlayer matchId={matchId} stageReady={stageReady} onLoadComplete={onLoadComplete} onRenderComplete={onRenderComplete} onComplete={onComplete} onGiveIn={onGiveIn} />
    </SSAProvider>
  )
};
export default BattlePlayer;
