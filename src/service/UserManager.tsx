import { User } from "model/User";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getCurrentAppConfig } from "util/PageUtils";
import useEventSubscriber from "./EventManager";
import { usePartnerManager } from "./PartnerManager";
interface UserEvent {
  id: string;
  name: string;
  data: any;
}

interface IUserContext {
  user: any | null;
  userEvent: UserEvent | null;
  authComplete: (user: User, persist: number) => number;
  logout: () => void;
  updateAsset: (asset: number, amount: number) => void;
  openPlay: (player: any, battleId: string | null) => void;
}

const UserContext = createContext<IUserContext>({
  user: null,
  userEvent: null,
  logout: () => null,
  authComplete: () => 1,
  updateAsset: () => null,
  openPlay: () => null,
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const { createEvent } = useEventSubscriber(["signin"], ["account"], "userProvider");
  const [lastTime, setLastTime] = useState<number>(0);
  const { app } = usePartnerManager();
  // const authByToken = useAction(api.UserService.authByToken);
  console.log("user provider");
  const [userEvent, setUserEvent] = useState<any>(null);
  // const userEvent: any = useQuery(api.events.getByUser, {
  //   uid: user?.uid ?? "###",
  //   lastTime,
  // });

  const openPlay = useCallback((player: any, battleId: string | null) => {
    const appConfig: any = getCurrentAppConfig();

    // const pageItem: PageItem = {
    //   name: "battlePlay",
    //   app: appConfig.name,
    //   // data: battleId ? { battleId, load: BATTLE_LOAD.PLAY } : undefined,
    //   // params: battleId ? { battleId, load: BATTLE_LOAD.PLAY } : null,
    // };
    // if (battleId) {
    //   pageItem.data = { battleId, load: BATTLE_LOAD.PLAY + "" };
    //   pageItem.params = { battleId, load: BATTLE_LOAD.PLAY + "" };
    // }
    // const mode = getURIParam("m");

    // if (window.Telegram) {
    //   pageItem.params = { uid: player.uid, token: player.token, m: "1" };
    //   const url = buildStackURL(pageItem);
    //   window.Telegram.WebApp.openLink(url);
    // } else if (mode && mode === "1") {
    //   pageItem.name = "lobbyPlay";
    //   openPage(pageItem);
    // } else {
    //   // pageItem.name = "battlePlay";
    //   // const stack = stacks.find((s) => s.name === "battlePlay");
    //   // if (!stack) openPage(pageItem);
    // }
  }, []);

  const authComplete = useCallback(
    (u: User, persist: number): number => {
      if (!u) {
        setUser(null);
        return 2;
      }
      u.timelag = u.timestamp ? u.timestamp - Date.now() : 0;
      // const mode = getURIParam("m"); //mode=1 one time play session

      if (persist) {
        localStorage.setItem("user", JSON.stringify(u));
      }
      if (u.battleId) {
        openPlay(u, u.battleId);
      }
      if (u.timestamp) setLastTime(u.timestamp);
      setUser(u);
      return 1;
    },

    []
  );
  const updateAsset = useCallback(
    (asset: number, amount: number) => {
      if (user.assets) {
        const as = user.assets.find((a: { asset: number; amount: number }) => a.asset === asset);
        if (as) as.amount = as.amount + amount;
        else user.assets.push({ asset: asset, amount });
      }
    },
    [user]
  );
  const logout = useCallback(() => {
    if (app) {
      localStorage.removeItem("user");
      setUser(null);
      createEvent({ name: "signout", topic: "account", delay: 0 });
    }
  }, [app]);
  useEffect(() => {
    if (userEvent && user) {
      if (userEvent?.name === "battleCreated") {
        const { id: battleId } = userEvent.data;
        openPlay(user, battleId);
      } else if (userEvent?.name === "assetUpdated") {
        const { asset, amount } = userEvent.data;
        if (asset) {
          const as = user.assets.find((a: { asset: number; amount: number }) => a.asset === asset);
          if (as) as.amount = amount;
          else user.assets.push({ asset, amount });
        }
      }
      if (userEvent.time > lastTime) setLastTime(userEvent.time);
    }
  }, [user, userEvent]);

  const value = {
    user,
    userEvent,
    updateAsset,
    authComplete,
    openPlay,
    logout,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
export const useUserManager = () => {
  const ctx = useContext(UserContext);

  return { ...ctx };
};
export default UserProvider;
