import { gsap } from "gsap";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useUserManager } from "service/UserManager";
import { useBattleManager } from "../../../service/BattleManager";
import useDimension from "../../../util/useDimension";

import { useAnimation } from "component/animation/battle/useAnimation";
import { useSearchMatch } from "component/animation/battle/useSearchMatch";
import { GAME_GOAL } from "model/Match3Constants";
import Avatar from "../common/Avatar";
import CountdownTimer from "../common/CountdownTimer";
import GoalCandy from "../console/GoalCandy";
import "./search.css";

const BattleReady = () => {
  const playerAvatarRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const sceneContainerRef = useRef<HTMLDivElement | null>(null);
  const goalPanelRef = useRef<HTMLDivElement | null>(null);
  const vsRef = useRef<HTMLDivElement | null>(null);
  // const { scenes, stageScene } = useSceneManager();
  const { width, height } = useDimension(sceneContainerRef);
  // const [countTime, setCountTime] = useState(0);
  const { battle, allGameLoaded } = useBattleManager();
  const { user } = useUserManager();
  const { playMatching, playCloseMatching, closeSearch } = useSearchMatch();
  const { playInitBattle } = useAnimation();

  const eles = useCallback(() => {
    const es = new Map<string, HTMLDivElement>();
    if (sceneContainerRef.current) es.set("container", sceneContainerRef.current);
    if (goalPanelRef.current) es.set("goal", goalPanelRef.current);
    if (vsRef.current) es.set("vs", vsRef.current);
    return es;
  }, [sceneContainerRef.current, goalPanelRef.current, vsRef.current]);

  const matchComplete = useCallback(() => {
    if (!battle || !allGameLoaded) return;
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    playCloseMatching(eles(), playerAvatarRefs.current, tl);
    const bl = gsap.timeline();
    tl.add(bl, ">");
    playInitBattle(battle, bl);
    tl.play();
  }, [battle, eles, allGameLoaded]);
  const matchCompleted = useMemo(() => {
    return battle && battle.startTime - Date.now() - user.timelag <= 0 ? true : false;
  }, [battle, user]);
  useEffect(() => {
    if (!battle || !user) return;
    const timeleft = battle?.startTime - user.timelag - Date.now();
    if (allGameLoaded && timeleft > 0) {
      console.log("closing search,play matching");
      const tl = gsap.timeline({
        onComplete: () => {
          // setCountTime(battle.startTime - Date.now() - user.timelag);
          tl.kill();
        },
      });
      const sl = gsap.timeline();
      tl.add(sl);
      closeSearch(sl);
      const ml = gsap.timeline();
      tl.add(ml, "<");
      playMatching(eles(), playerAvatarRefs.current, ml);
      tl.play();
    }
  }, [battle, user, allGameLoaded]);
  const timeLeft = useMemo(() => {
    if (battle && user) {
      const time = battle.startTime - user.timelag - Date.now();
      return time;
    }
    return -1;
  }, [battle, user]);
  const load = (uid: string, ele: HTMLDivElement | null) => {
    if (ele) {
      playerAvatarRefs.current.set(uid, ele);
    }
  };
  const goals = useMemo(() => {
    if (battle) {
      const gameGoal = GAME_GOAL.find((g) => g.id === battle.data.goal);
      return gameGoal?.goal;
    }
    return [];
  }, [battle]);

  return (
    <>
      {!matchCompleted ? (
        <div ref={sceneContainerRef} className="match_container">
          {battle?.players?.map((player) => (
            <div
              key={player.uid}
              ref={(ele) => load(player.uid, ele)}
              style={{
                opacity: 0,
                position: "absolute",
                top: height * 0.4,
                left: width / 2,
                width: 80,
                height: 80,
              }}
            >
              {player ? <Avatar player={player} mode={0} /> : null}
            </div>
          ))}

          <div
            ref={vsRef}
            style={{
              opacity: 0,
              position: "absolute",
              top: height * 0.4 + 40,
              left: 0,
              display: "flex",
              justifyContent: "center",
              width: "100%",
            }}
          >
            <span style={{ fontSize: 20 }}>VS</span>
          </div>

          <div
            ref={goalPanelRef}
            style={{
              opacity: 0,
              position: "absolute",
              top: height * 0.7,
              left: 0,
              width: "100%",
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 25, color: "white" }}>Goal</div>
              <div style={{ height: 40 }} />
              <div style={{ display: "flex" }}>
                {goals &&
                  goals.map((a: any) => (
                    <div
                      key={a.asset}
                      style={{
                        width: 55,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontSize: 12 }}>{a.quantity}</div>
                      <div style={{ width: 35, height: 35 }}>
                        <GoalCandy asset={a.asset} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              top: height * 0.3,
              left: 0,
              width: "100%",
              display: "flex",
              justifyContent: "center",
            }}
          >
            {timeLeft >= 0 ? <CountdownTimer time={timeLeft} onTimeout={matchComplete} /> : null}
          </div>
        </div>
      ) : null}
    </>
  );
};

export default BattleReady;
