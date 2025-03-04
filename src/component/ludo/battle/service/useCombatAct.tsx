import { useConvex } from "convex/react";
import { useCallback } from "react";
import { useUserManager } from "service/UserManager";
import { api } from "../../../../convex/ludo/convex/_generated/api";
import { ACTION_TYPE } from "../types/CombatTypes";
import { useCombatManager } from "./CombatManager";
const useCombatAct = () => {

  const { user } = useUserManager();
  const { game, eventQueue } = useCombatManager();
  // const { processRoll, processTokenSelect, processSkillSelect } = useActionProcessor();
  const convex = useConvex();

  const roll = useCallback(async () => {
    if (!game || game.currentSeat < 0)
      return;
    const seatNo = game.currentSeat;
    const seat = game?.seats.find((s) => s.no === seatNo)
    if (!seat || seat.uid !== user.uid || game.currentAction?.type !== ACTION_TYPE.ROLL) return;
    eventQueue.push({ name: "rollStart", data: { seatNo: seat.no } });
    const res = await convex.mutation(api.service.gameProxy.roll, {
      gameId: game?.gameId ?? "123",
      uid: user?.uid,
      token: "test-token",
    });
    console.log("roll res", res);

  }, [eventQueue, game, user]);

  const selectToken = useCallback(async (tokenId: number) => {
    console.log("selectToken", tokenId)
    if (!game || game.currentSeat < 0)
      return;
    const seatNo = game.currentSeat;
    const seat = game?.seats.find((s) => s.no === seatNo)
    if (!seat || seat.uid !== user.uid) return;
    eventQueue.push({ name: "tokenSelected", data: { seatNo: seat.no, tokenId: tokenId } });
    const res = await convex.mutation(api.service.gameProxy.selectToken, {
      gameId: game?.gameId ?? "123",
      tokenId: tokenId,
      uid: user?.uid,
      token: "test-token",
    });
    console.log("roll res", res);

  }, [eventQueue, game, user]);
  const timeout = useCallback(async () => {
    if (!game) return;
    await convex.mutation(api.service.gameProxy.timeout, { gameId: game.gameId });
  }, [game, user]);
  const turnOffBot = useCallback(async () => {
    if (!game) return;
    await convex.mutation(api.service.gameProxy.turnOffBot, { gameId: game.gameId, uid: user?.uid, token: "test-token" });
  }, [game, user]);
  return { roll, selectToken, timeout, turnOffBot };
};
export default useCombatAct;

