import { useAction } from "convex/react";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getURIParam } from "util/PageUtils";
import { api } from "../convex/_generated/api";
import { usePageManager } from "./PageManager";

interface IUserContext {
  user: any;
  authComplete: (user: any, persist: number) => void;
  logout: () => void;
  updateAsset: (asset: number, amount: number) => void;
}

const UserContext = createContext<IUserContext>({
  user: null,
  logout: () => null,
  authComplete: (user: any, persist: number) => null,
  updateAsset: () => null,
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const { loadModule } = usePageManager();
  console.log("user provider");
  const authByToken = useAction(api.UserService.authByToken);
  const authComplete = useCallback((u: any, persist: number) => {
    if (u.role > 1) loadModule("merchant");
    setUser(u);
    if (u?.uid && persist > 0) localStorage.setItem("user", JSON.stringify(u));
    else localStorage.removeItem("user");
  }, []);

  const updateAsset = useCallback((asset: number, amount: number) => {
    if (user.assets) {
      const as = user.assets.find((a: { asset: number; amount: number }) => a.asset === asset);
      if (as) as.amount = as.amount + amount;
      else user.assets.push({ asset: asset, amount });
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("user");
    setUser({});
    // createEvent({ name: "signout", topic: "account", delay: 0 });
  }, []);

  useEffect(() => {
    const checkStorage = async () => {
      const userJSON = localStorage.getItem("user");
      let u;
      if (userJSON !== null) {
        const userObj = JSON.parse(userJSON);
        // console.log(userObj);
        if (userObj && userObj["uid"] && userObj["token"]) {
          u = await authByToken({ uid: userObj["uid"], token: userObj["token"] });
          authComplete(u ?? {}, 1);
        }
      } else authComplete({}, 0);
    };
    const checkURL = async (uid: string, token: string, persist: number) => {
      const u = await authByToken({ uid, token });
      authComplete(u ?? {}, persist);
    };
    const uid = getURIParam("u");
    const token = getURIParam("t");
    const persist = getURIParam("p");
    if (uid && token) checkURL(uid, token, persist ? Number(persist) : 0);
    else checkStorage();
  }, []);
  return (
    <>
      <UserContext.Provider value={{ user, updateAsset, authComplete, logout }}>{children}</UserContext.Provider>
    </>
  );
};
export const useUserManager = () => {
  return useContext(UserContext);
};
export default UserProvider;
