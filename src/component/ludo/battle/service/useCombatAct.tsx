import { useConvex } from "convex/react";
import { useCallback } from "react";
import { useUserManager } from "service/UserManager";
import { Skill } from "../types/CharacterTypes";
import { CombatEvent } from "../types/CombatTypes";
import { useCombatManager } from "./CombatManager";

const useCombatAct = () => {

  const { user } = useUserManager();
  const { game, eventQueue, currentRound } = useCombatManager();
  // const { processRoll, processTokenSelect, processSkillSelect } = useActionProcessor();
  const convex = useConvex();

  const roll = useCallback(async (seatNo: number) => {
    console.log("roll", seatNo);
    // processRoll(seatNo);
    const event: CombatEvent = {
      name: "roll",
      actor: user?.uid,
      data: { code: 4, seatNo }
    }
    eventQueue.push(event);

  }, [eventQueue]);

  const useSkill = useCallback(async (skill: Skill) => {

    if (!currentRound || !game) return;

  }, [currentRound, game]);


  return { roll, useSkill };
};
export default useCombatAct;

