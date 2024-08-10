import React, { useCallback, useMemo } from "react";
import { useBattleManager } from "service/BattleManager";
import { CircularProgressButton } from "./CircularProgressButton";
interface Props {
  gameBound: { top: number; left: number; width: number; height: number } | null;
}
const SkillControl: React.FC<Props> = ({ gameBound }) => {
  const { currentSkill, setCurrentSkill } = useBattleManager();
  // const gameBound = useMemo(() => {
  //   if (game && battle?.games && battle.games.length > 0 && containerBound) {
  //     const mode =
  //       battle.games?.length === 1 || load === BATTLE_LOAD.REPLAY
  //         ? 0
  //         : game.uid === user.uid || battle.games[0].gameId === game.gameId
  //         ? 1
  //         : 2;
  //     const { width, height } = containerBound;
  //     const { column, row } = battle.data;
  //     const sbound = getGameBound(width, height, column, row, mode);
  //     return sbound;
  //   }
  //   return null;
  // }, [battle, game, containerBound]);
  const skillBound = useMemo(() => {
    if (gameBound) {
      const { top, left, width, height } = gameBound;
      return { top: top + height + 20, left: left, width: width, height: 60 };
    }
  }, [gameBound]);

  const noteBound = useMemo(() => {
    if (gameBound) {
      const { top, left, width } = gameBound;
      return { top: top - 80, left: left, width: width, height: 80 };
    }
    return null;
  }, [gameBound]);

  const toggleSkill = useCallback(
    (s: number) => {
      if (s === 0 || s === currentSkill) setCurrentSkill(0);
      else if (currentSkill === 0) {
        setCurrentSkill(s);
      }
    },
    [currentSkill]
  );

  return (
    <>
      {currentSkill && skillBound ? (
        <div
          style={{
            position: "absolute",
            zIndex: 120,
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: 0.6,
            backgroundColor: "black",
          }}
          onClick={() => toggleSkill(0)}
        ></div>
      ) : null}
      {currentSkill && noteBound ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            position: "absolute",
            zIndex: 150,
            top: noteBound.top,
            left: noteBound.left,
            width: noteBound.width,
            height: noteBound.height,
            color: "white",
          }}
        >
          choose a candy to remove
        </div>
      ) : null}
      {skillBound ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            position: "absolute",
            zIndex: 150,
            top: skillBound.top,
            left: skillBound.left,
            width: skillBound.width,
            height: skillBound.height + 30,
            backgroundColor: "transparent",
          }}
        >
          <CircularProgressButton skill={1} onClick={() => toggleSkill(1)} />
          <CircularProgressButton skill={2} onClick={() => toggleSkill(2)} />
          <CircularProgressButton skill={3} onClick={() => toggleSkill(3)} />
        </div>
      ) : null}
    </>
  );
};

export default SkillControl;
