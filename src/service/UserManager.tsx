
import { useConvex } from "convex/react";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../convex/sso/convex/_generated/api";
import { SSA_AUTH_URLS } from "./SSAManager";

export interface User {
  uid?: string;
  partner?: number;
  token?: string;
  expire?: number;
  lastUpdate?: number;
  name?: string;
  email?: string;
  phone?: string;
  data?: { [k: string]: any };
  assets?: { [k: string]: number };
}
export enum AppSessionStatus {
  TO_BE_SIGNED_IN = 0,
  SIGNING_IN = 1,
  SIGNED_IN = 2,
  TO_BE_SIGNED_OUT = 3,
  SIGNING_OUT = 4,
  SIGNED_OUT = 5,
}
export interface AppSession {
  app: string;
  player?: any;
  time?: number;
  status: AppSessionStatus;
}
export interface UserEvent {
  uid?: string;
  name: string;
  time: number;
  data?: any;
}
interface IUserContext {
  user: any;
  sessions: AppSession[];
  // updateLoaded: () => void;
  ssaAuthComplete: (ssa: string, player: any) => void;
  // updateSession: (app: string, session: { token: string; status: number }) => void;
  authComplete: (user: any, persist: number) => void;
  logout: () => Promise<void>;
  updateUserData: (data: any) => Promise<void>;
}

const UserContext = createContext<IUserContext>({
  user: null,
  sessions: [],
  ssaAuthComplete: () => null,
  logout: async () => { },
  authComplete: (user: any, persist: number) => null,
  updateUserData: async () => { },
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<AppSession[]>([]);
  // const [events, setEvents] = useState<Event[] | null>(null);
  // const [lastUpdate, setLastUpdate] = useState<number | undefined>(user?.lastUpdate);
  const convex = useConvex();
  // const userEvents: UserEvent[] | undefined = useQuery(api.dao.eventDao.find, { uid: user?.uid ?? "", lastUpdate });

  const authComplete = useCallback((u: any, persist: number) => {
    console.log("authComplete", u);
    u.expire = u.expire + Date.now();
    setUser(u);

  }, []);
  const updateUserData = useCallback(async (data: any) => {
    console.log("updateUserData", user?.uid, user?.token, data);
    if (user?.uid && user?.token) {
      const result = await convex.action(api.service.AuthManager.updateData, { uid: user?.uid, token: user?.token, data })
      // console.log("updateData result", result);
    }
  }, [user]);

  const logout = useCallback(async () => {

    if (user?.uid && user?.token) {
      const result = await convex.action(api.service.AuthManager.logout, { uid: user?.uid, token: user?.token })
      console.log("logout result", result);
      if (result) {
        localStorage.removeItem("user");
        setUser({});
        // setSessions([...sessions])
      }
    }
  }, [user, sessions]);


  const ssaAuthComplete = useCallback((ssa: string, player: any) => {
    const session = sessions.find((s) => s.app === ssa);

    if (session) {
      session.status = AppSessionStatus.SIGNED_IN;
      session.player = player;
      setSessions([...sessions])
    }
  }, [sessions]);


  useEffect(() => {

    const authByToken = async (uid: string, token: string) => {
      const u = await convex.action(api.service.AuthManager.authByToken, { uid, token });
      // console.log("UserProvider", "authByToken", u)
      if (u?.uid && u?.token) {
        setTimeout(() => { authComplete(u, 1); }, 500);
      } else {
        localStorage.removeItem("user");
        setTimeout(() => { setUser({}); }, 500);
      }
    }
    const userJSON = localStorage.getItem("user");
    if (userJSON !== null) {
      const userObj = JSON.parse(userJSON);
      // console.log("UserProvider", userObj)
      const { uid, token } = userObj;
      if (uid && token) {
        authByToken(uid, token);
      }
    } else {
      setTimeout(() => { setUser({}); }, 500);
    }

  }, []);

  useEffect(() => {
    if (user?.uid && user?.token) {
      setSessions(Object.keys(SSA_AUTH_URLS).map(key => {
        return { app: key, status: AppSessionStatus.TO_BE_SIGNED_IN }
      }))
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      setSessions([])
      localStorage.removeItem("user");
    }
  }, [user])

  const value = { user, authComplete, logout, sessions, ssaAuthComplete, updateUserData };
  return (<UserContext.Provider value={value}>{children}</UserContext.Provider>);
};
export const useUserManager = () => {
  return useContext(UserContext);
};
export default UserProvider;
