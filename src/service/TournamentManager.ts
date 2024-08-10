import { useConvex } from "convex/react";
import { useCallback } from "react";
import { api } from "../convex/_generated/api";
import useEventSubscriber from "./EventManager";
import { usePageManager } from "./PageManager";
import { useUserManager } from "./UserManager";


const useTournamentManager = () => {
  const { createEvent } = useEventSubscriber([], [])
  const { openPage } = usePageManager()
  const { user, openPlay } = useUserManager();

  const convex = useConvex();

  const exit = useCallback(async (): Promise<void> => {
    const res = await convex.action(api.matchqueue.exit, { uid: user.uid, token: user.token });

  }, [user])
  const join = useCallback(async (tournamentId: string): Promise<{ ok: boolean, code?: number } | null> => {


    const rs = await convex.action(api.tournaments.join, { uid: user.uid, token: user.token, tid: tournamentId });
    console.log(rs)
    if (!rs.ok) {
      createEvent({ name: "tournamentAct", topic: "alert", data: rs.message, delay: 0 })
    } else {
      createEvent({ name: "searchOpen", topic: "search", delay: 0 });
    }
    return null

  }, [user, openPage, createEvent, openPlay])
  const listActives = useCallback(
    async (): Promise<any[]> => {
      if (!user) return [];
      const allOpens: any | null = await convex.query(api.tournaments.findAll, { uid: user.uid, token: user.token });
      return allOpens;
    },
    [user, convex]
  );
  const findBattle = useCallback(
    async (battleId: string): Promise<any> => {
      console.log(user.uid + ":" + user.token)
      const battle: any = await convex.action(api.battle.findBattle, { battleId, uid: user.uid, token: user.token });
      return battle;
    },
    [convex, user]
  );
  return { join, exit, listActives, findBattle };
};
export default useTournamentManager;
