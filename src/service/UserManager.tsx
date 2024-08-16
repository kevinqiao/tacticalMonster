import { useConvex } from "convex/react";
import { User } from "model/User";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getURIParam } from "util/PageUtils";
import { api } from "../convex/_generated/api";
import useEventSubscriber from "./EventManager";
import { usePageManager } from "./PageManager";
import { usePartnerManager } from "./PartnerManager";
interface UserEvent {
  id: string;
  name: string;
  data: any;
}

interface IUserContext {
  user: any | null;
  authComplete: (user: User, persist: number) => number;
  logout: () => void;
  updateAsset: (asset: number, amount: number) => void;
}

const UserContext = createContext<IUserContext>({
  user: null,
  logout: () => null,
  authComplete: () => 1,
  updateAsset: () => null,
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const { partner } = usePartnerManager();
  const { app, currentPage } = usePageManager();
  const { createEvent } = useEventSubscriber(["signin"], ["account"]);
  console.log("user provider");
  const convex = useConvex();
  const authByToken = useCallback(
    async ({ uid, token }: { uid: string; token: string }) => {
      return await convex.action(api.UserService.authByToken, { uid, token });
    },
    [convex]
  );

  const authComplete = useCallback(
    (u: any, persist: number) => {
      setUser(u);
      if (u?.uid) {
        u.timelag = u.timestamp ? u.timestamp - Date.now() : 0;
        if (persist) {
          localStorage.setItem("user", JSON.stringify(u));
        }
      }
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
      setUser({});
      // createEvent({ name: "signout", topic: "account", delay: 0 });
    }
  }, [app]);
  useEffect(() => {
    const checkStorage = async (partnerId: number) => {
      const userJSON = localStorage.getItem("user");
      let u = {};
      if (userJSON !== null) {
        const userObj = JSON.parse(userJSON);
        console.log(userObj);
        if (userObj && userObj["uid"] && userObj["token"] && userObj["partner"] === partnerId) {
          u = await authByToken({ uid: userObj["uid"], token: userObj["token"] });
        }
      }
      authComplete(u, 1);
    };
    if (partner && !getURIParam("u") && !getURIParam("t")) checkStorage(partner.pid);
  }, [partner]);

  useEffect(() => {
    const checkURL = async (uid: string, token: string, persist: number) => {
      const u = await authByToken({ uid, token });
      authComplete(u ?? {}, persist);
    };
    const param = currentPage?.params;
    if (param?.u && param?.t) checkURL(param.u, param.t, param["c"] ? Number(param["c"]) : 0);
  }, [currentPage]);
  const value = {
    user,
    updateAsset,
    authComplete,
    logout,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
export const useUserManager = () => {
  const ctx = useContext(UserContext);

  return { ...ctx };
};
export default UserProvider;
