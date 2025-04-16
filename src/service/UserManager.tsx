import { useConvex, useQuery } from "convex/react";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../convex/sso/convex/_generated/api";
import { SSA_AUTH_URLS } from "./SSAManager";

export interface User {
  uid?: string;
  cid?: string;
  partner?: number;
  token?: string;
  expire?: number;
  name?: string;
  email?: string;
  phone?: string;
  data?: { [k: string]: any };
  game?: { name: string, id: string, status: number };
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
interface Event {
  uid?: string;
  name: string;
  time: number;
  data?: any;
}
interface IUserContext {
  user: any;
  sessions: AppSession[];
  events: Event[] | null;
  // updateLoaded: () => void;
  ssaAuthComplete: (ssa: string, player: any) => void;
  ssaSignOut: (ssa: string) => void;
  // updateSession: (app: string, session: { token: string; status: number }) => void;
  authComplete: (user: any, persist: number) => void;
  logout: () => void;
}

const UserContext = createContext<IUserContext>({
  user: null,
  sessions: [],
  events: null,
  // updateSession: () => null,
  // updateLoaded: () => null,
  ssaAuthComplete: () => null,
  ssaSignOut: () => null,
  logout: () => null,
  authComplete: (user: any, persist: number) => null,
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<AppSession[]>([]);
  const [events, setEvents] = useState<Event[] | null>(null);
  const [lastTime, setLastTime] = useState<number | undefined>(undefined);
  const convex = useConvex();
  const userEvents = useQuery(api.dao.eventDao.find, { uid: user?.uid ?? "", lastTime });


  const authComplete = useCallback((u: any, persist: number) => {
    // if (persist > 0) {
    //   localStorage.setItem("user", JSON.stringify(u));
    // }
    console.log("authComplete", u);

    u.expire = u.expire + Date.now();
    localStorage.setItem("user", JSON.stringify(u));

    sessions.length = 0;
    Object.keys(SSA_AUTH_URLS).forEach(key => {
      sessions.push({ app: key, status: AppSessionStatus.TO_BE_SIGNED_IN })
    })
    setUser(u);
    setSessions([...sessions])


  }, [sessions]);

  const logout = useCallback(async () => {

    if (user?.uid && user?.token) {
      const result = await convex.action(api.service.AuthManager.logout, { uid: user?.uid, token: user?.token })
      console.log("logout result", result);
      if (result) {
        localStorage.removeItem("user");
        sessions.forEach(s => {
          s.status = AppSessionStatus.TO_BE_SIGNED_OUT;
        })
        setUser({});
        setSessions([...sessions])
      }
    }
  }, [user, sessions]);
  const ssaSignOut = useCallback((ssa: string) => {
    const session = sessions.find((s) => s.app === ssa);
    if (session && session.status === AppSessionStatus.SIGNING_OUT) {
      console.log("ssaSignOut", session);
      session.status = AppSessionStatus.SIGNED_OUT;
      session.player = undefined;
      setSessions([...sessions])
    }
  }, [sessions]);
  // const updateLoaded = useCallback(() => {
  //   if (user?.uid && user?.token) {
  //     convex.mutation(api.dao.userDao.updateLoaded, { uid: user.uid, token: user.token }).then((res) => {
  //       console.log("updateLoaded", res)
  //       if (res) {
  //         setUser((pre) => {
  //           if (pre?.game)
  //             pre.game.status = 1;
  //           return pre
  //         })
  //       }
  //     })
  //   }
  // }, [user]);
  const ssaAuthComplete = useCallback((ssa: string, player: any) => {
    const session = sessions.find((s) => s.app === ssa);
    console.log("ssaAuthComplete", ssa, player);
    if (session) {
      session.status = AppSessionStatus.SIGNED_IN;
      session.player = player;
      setSessions([...sessions])
    }
  }, [sessions]);

  useEffect(() => {

    const authByToken = async (uid: string, token: string) => {
      const u = await convex.action(api.service.AuthManager.authByToken, { uid, token });
      if (u?.uid && u?.token) {
        authComplete(u, 1);
      }
    }
    const userJSON = localStorage.getItem("user");
    if (userJSON !== null) {
      const userObj = JSON.parse(userJSON);
      const { uid, token } = userObj;
      if (uid && token) {
        authByToken(uid, token);
        return;
      }
    }
    setUser({});

  }, []);
  useEffect(() => {

    if (Array.isArray(userEvents) && userEvents.length > 0) {
      console.log("userEvents", userEvents);
      const event = userEvents[userEvents.length - 1] as Event;

      if (event.name !== "####") {
        setLastTime(event.time);
        const events: Event[] = userEvents;
        for (const e of events) {
          if (e.name === "GameCreated" && user?.uid) {
            setUser((pre) => {
              if (pre) {
                pre.game = e.data;
                return { ...pre }
              }
              return null
            })

          }
        }
      } else {
        setLastTime(event.time);
      }
    }
  }, [userEvents]);
  const value = { user, authComplete, logout, sessions, ssaAuthComplete, ssaSignOut, events };
  return (<UserContext.Provider value={value}>{children}</UserContext.Provider>);
};
export const useUserManager = () => {
  return useContext(UserContext);
};
export default UserProvider;
