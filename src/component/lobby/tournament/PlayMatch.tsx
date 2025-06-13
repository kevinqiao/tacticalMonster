import { PageProp } from "component/RenderApp";
import BattlePlayer from "component/solitaire/battle/BattlePlayer";
import gsap from "gsap";
import React, { useCallback, useRef, useState } from "react";
import { useUserManager } from "service/UserManager";
import "./style.css";

export interface BattleProp {
  matchId: string | undefined;
  stageReady: boolean;
  onRenderComplete: () => void;
  onComplete: () => void;
  onGiveIn: () => void;
  onLoadComplete: () => void;
}


const PlayMatch: React.FC<PageProp> = ({ data, openFull, close }) => {
  const loadRef = useRef<HTMLDivElement>(null);
  const playRef = useRef<HTMLDivElement>(null);
  const [stageReady, setStageReady] = useState(false);
  const { user } = useUserManager();
  console.log("Battle", data);
  const onComplete = useCallback(() => {
    console.log("onMatchComplete");
    user.data.matchId = undefined;
    close?.();
  }, [user]);
  const onGiveIn = useCallback(() => {
    user.data.matchId = undefined;
    console.log("onMatchCancel");
    close?.();
  }, [user]);
  const onLoadComplete = useCallback(async () => {
    console.log("onLoadComplete");
    await openFull?.();
    setStageReady(true);
  }, [openFull]);
  const onRenderComplete = useCallback(() => {
    const tl = gsap.timeline();
    tl.to(loadRef.current, { autoAlpha: 0, duration: 2 }).to(playRef.current, { autoAlpha: 1, duration: 2 }, "<");
    tl.play();
  }, []);
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div id="game-load" ref={loadRef} className="game-loading">
        Loading Game...
      </div>
      <div id="game-play" ref={playRef} className="game-play">
        {data?.matchId && <BattlePlayer matchId={data.matchId} stageReady={stageReady} onLoadComplete={onLoadComplete} onRenderComplete={onRenderComplete} onComplete={onComplete} onGiveIn={onGiveIn} />}
      </div>
    </div>
  );
};
export default PlayMatch;
