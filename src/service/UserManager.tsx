import { useConvex, useQuery } from "convex/react";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../convex/sso/convex/_generated/api";

export interface User {
  uid?: string;
  cid?: string;
  partner?: number;
  token?: string;
  expire?: number;
  name?: string;
  email?: string;
  phone?: string;
  data?: { [k: string]: string };
}
interface Event {
  uid?: string;
  name: string;
  time: number;
  data?: any;
}
interface IUserContext {
  user: any;
  sessions: { [k: string]: { token: string; status: number } };
  events: Event[] | null;
  updateSession: (app: string, session: { token: string; status: number }) => void;
  authComplete: (user: any, persist: number) => void;
  logout: () => void;
}

const UserContext = createContext<IUserContext>({
  user: null,
  sessions: {},
  events: null,
  updateSession: () => null,
  logout: () => null,
  authComplete: (user: any, persist: number) => null,
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<{ [k: string]: { token: string; status: number } }>({});
  const [events, setEvents] = useState<Event[] | null>(null);
  const [lastTime, setLastTime] = useState<number | undefined>(undefined);
  const convex = useConvex();
  const userEvents = useQuery(api.dao.eventDao.find, { uid: user?.uid ?? "", lastTime });



  const authComplete = useCallback((u: any, persist: number) => {
    if (persist > 0) {
      localStorage.setItem("user", JSON.stringify(u));
    }
    Object.keys(sessions).forEach(key => delete sessions[key]);
    console.log("u", u)
    if (u.expire)
      setTimeout(() => refreshToken({ uid: u.uid, token: u.token }), u.expire - 1000)
    setUser(u);
  }, [sessions]);

  const logout = useCallback(() => {
    console.log("logout", user)
    if (user?.uid && user?.token) {
      convex.action(api.service.AuthManager.logout, { uid: user?.uid, token: user?.token }).then(result => {
        if (result) {
          localStorage.removeItem("user");
          setUser({});
          setSessions({});
        }
      });
    }
  }, [user]);
  const updateSession = useCallback((app: string, session: { token: string; status: number }) => {
    setSessions(pre => ({ ...pre, [app]: session }))
    // setSessions((pre) => {
    //   const s = pre[app]
    //   if (s) {
    //     s.token = session.token
    //     s.status = session.status
    //     return { ...pre }
    //   }
    //   return pre
    // })
  }, []);
  const refreshToken = useCallback(({ uid, token }: { uid: string, token: string }) => {

    convex.action(api.service.AuthManager.refreshToken, { uid, token }).then(u => {
      console.log("refresh", u);
      // Object.keys(sessions).forEach(key => delete sessions[key]);
      if (u?.uid && u?.token) {
        const userId = u.uid;
        const userToken = u.token;
        setTimeout(() => refreshToken({ uid: userId, token: userToken }), u.expire ? u.expire - 1000 : 50000);
        const expire = u.expire ? u.expire + Date.now() : 0;
        localStorage.setItem("user", JSON.stringify({ ...u, expire }));
        setUser((pre) => pre && pre.uid === u.uid ? Object.assign(pre, { token: u.token }) : u)
      } else
        setUser({})
      setSessions({});
    });
  }, [sessions]);
  useEffect(() => {
    const userJSON = localStorage.getItem("user");
    console.log("userJSON", userJSON)
    if (userJSON !== null) {
      const userObj = JSON.parse(userJSON);
      const { uid, token, expire } = userObj;
      if (uid && token && (!expire || expire > Date.now())) {
        refreshToken({ uid, token });
        // convex.action(api.service.AuthManager.refreshToken, { uid, token }).then(u => {
        //   console.log("refresh", u);
        //   if (u) {
        //     const expire = u.expire ? u.expire + Date.now() : 0;
        //     localStorage.setItem("user", JSON.stringify({ ...u, expire }));
        //     setUser(u)
        //   } else
        //     setUser(null)
        // });
      } else {
        localStorage.removeItem("user");
        setUser({});
      }
    } else {
      setUser({});
    }
  }, []);
  useEffect(() => {
    console.log("userEvents", userEvents);
    if (Array.isArray(userEvents) && userEvents.length > 0) {
      const event = userEvents[userEvents.length - 1] as Event;

      if (event.name !== "####") {
        setLastTime(event.time);
        const events: Event[] = userEvents;
        for (const e of events) {
          if (e.name === "GameCreated" && e.data?.gameId && user?.uid) {
            const gameId = e.data?.gameId;
            if (gameId) {
              setUser((pre) => {
                if (pre) {
                  pre.data = pre.data ? { ...pre.data, gameId } : { gameId }
                  return { ...pre }
                }
                return null
              })
            }
          }
        }
      } else {
        setLastTime(event.time);
      }
    }
  }, [userEvents]);
  const value = { user, authComplete, logout, sessions, updateSession, events };
  return (<UserContext.Provider value={value}>{children}</UserContext.Provider>);
};
export const useUserManager = () => {
  return useContext(UserContext);
};
export default UserProvider;
