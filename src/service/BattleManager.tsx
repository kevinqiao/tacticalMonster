import { BATTLE_LOAD } from "model/Constants";
import { PagePosition } from "model/PageProps";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { BattleModel } from "../model/Battle";
import useTournamentManager from "./TournamentManager";
import { useUserManager } from "./UserManager";

interface IBattleContext {
  currentSkill: number;
  load: number;
  battle: BattleModel | null;
  allGameLoaded: boolean;
  overReport: number;
  containerBound: PagePosition | null | undefined;
  setCurrentSkill: (skill: number) => void;
  setOverReport: (status: number) => void;
  timeout: () => void;
  loadGame: (gameId: string, data: any) => void;
  // disableCloseBtn: () => void;
  // exit: () => void;
  // reset: () => void;
}
const BattleContext = createContext<IBattleContext>({
  currentSkill: 0,
  load: 0,
  allGameLoaded: false,
  battle: null,
  overReport: 0,
  containerBound: null,
  setCurrentSkill: (skill: number) => {
    return;
  },
  setOverReport: (status: number) => {
    return;
  },
  // reset: () => null,
  timeout: () => null,
  loadGame: (gameId: string, data: any) => null,
  // disableCloseBtn: () => null,
  // exit: () => null,
});

export const BattleProvider = ({
  battleId,
  pagePosition,
  children,
}: {
  battleId: string | undefined;
  pagePosition: PagePosition;
  children: React.ReactNode;
}) => {
  const [currentSkill, setCurrentSkill] = useState(0);
  const [allGameLoaded, setAllGameLoaded] = useState(false);
  const [overReport, setOverReport] = useState(0); //0-no report 1-my game is over(open game report) 2-battle is over (open battle report)
  const { user } = useUserManager();
  const [battle, setBattle] = useState<BattleModel | null>(null);
  const { findBattle } = useTournamentManager();
  useEffect(() => {
    if (!battle && battleId) {
      findBattle(battleId).then((b: any) => {
        console.log(b);
        setBattle(b);
      });
    }
  }, [battleId]);

  useEffect(() => {
    if (!user || !battle) return;
    const mygame = battle.games?.find((g) => g.uid === user.uid);
    const timeLeft = battle.duration + battle.startTime - Date.now() + user.timelag;
    if (battle.rewards || battle.status || mygame?.result || timeLeft < 0) setOverReport(2);
  }, [battle, user]);

  const value = {
    currentSkill,
    load: BATTLE_LOAD.PLAY,
    allGameLoaded,
    battle,
    overReport,
    containerBound: pagePosition,
    setCurrentSkill,
    setOverReport,
    timeout: useCallback(() => {
      if (overReport === 0) setOverReport(1);
      else if (overReport === 2) setOverReport(3);
    }, [battle, overReport]),

    loadGame: useCallback(
      (gameId: string, data: any) => {
        if (!battle || !battle.games) return;
        const game = battle?.games.find((g) => g.gameId === gameId);
        if (game) {
          game.data = data;
          game.status = 1;
          if (battle.games.every((g) => g.status)) {
            setAllGameLoaded(true);
            // playInitBattle(battle, null);
          }
        }
      },
      [battle]
    ),
    // reset: useCallback(() => {
    //   setAllGameLoaded(false);
    // }, [battle]),
    // exit: useCallback(() => {
    //   if (pageProp.close) pageProp.close(0);
    // }, [pageProp]),

    // disableCloseBtn: useCallback(() => {
    //   if (pageProp.disableCloseBtn) {
    //     pageProp.disableCloseBtn();
    //   }
    // }, [pageProp]),
  };

  return <BattleContext.Provider value={value}> {battle ? children : null} </BattleContext.Provider>;
};
export const useBattleManager = () => {
  return useContext(BattleContext);
};

export default BattleProvider;
