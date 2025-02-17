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

  const roll = useCallback(async () => {

    const res = await convex.action(api.service.gameProxy.roll, {
      gameId: game?.gameId ?? "123",
      uid: user?.uid,
      token: "test-token",
    });
    console.log("roll res", res);
    if (res) {
      const seat = game?.seats.find((s) => s.uid === user.uid)
      if (!seat) return;
      eventQueue.push({ name: "rollStart", data: { seatNo: seat.no } });
    }

  }, [eventQueue, game, user]);

  const useSkill = useCallback(async (skill: Skill) => {

    if (!currentRound || !game) return;

  }, [currentRound, game]);


  return { roll, useSkill };
};
export default useCombatAct;

