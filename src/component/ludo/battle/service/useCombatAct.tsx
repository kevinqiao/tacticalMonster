import { useConvex } from "convex/react";
import { useCallback } from "react";
import { useUserManager } from "service/UserManager";
import { api } from "../../../../convex/ludo/convex/_generated/api";
import { Skill } from "../types/CharacterTypes";
import { useCombatManager } from "./CombatManager";

const useCombatAct = () => {

  const { user } = useUserManager();
  const { game, eventQueue, currentRound } = useCombatManager();
  // const { processRoll, processTokenSelect, processSkillSelect } = useActionProcessor();
  const convex = useConvex();

  const roll = useCallback(async (seatNo: number) => {
    console.log("roll", seatNo);
    const res = await convex.action(api.service.gameProxy.roll, {
      gameId: game?.gameId ?? "123",
      uid: user?.uid,
      token: "test-token",
    });
    console.log("roll res", res);
    if (res) {
      eventQueue.push({ name: "rollStart", data: { seatNo } });
    }

  }, [eventQueue, game]);

  const useSkill = useCallback(async (skill: Skill) => {

    if (!currentRound || !game) return;

  }, [currentRound, game]);


  return { roll, useSkill };
};
export default useCombatAct;

