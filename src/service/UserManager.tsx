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
  data?: { [k: string]: any };
  game?: { name: string, id: string, status: number };
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
  updateLoaded: () => void;
  updateSession: (app: string, session: { token: string; status: number }) => void;
  authComplete: (user: any, persist: number) => void;
  logout: () => void;
}

const UserContext = createContext<IUserContext>({
  user: null,
  sessions: {},
  events: null,
  updateSession: () => null,
  updateLoaded: () => null,
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
    if (u.expire > 0) {
      setTimeout(() => refreshToken({ uid: u.uid, token: u.token }), u.expire - 10000)
      u.expire = u.expire + Date.now();
      localStorage.setItem("user", JSON.stringify(u));
      setUser(u);
    }

  }, [sessions]);

  const logout = useCallback(() => {

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
  const updateLoaded = useCallback(() => {
    if (user?.uid && user?.token) {
      convex.mutation(api.dao.userDao.updateLoaded, { uid: user.uid, token: user.token }).then((res) => {
        console.log("updateLoaded", res)
        if (res) {
          setUser((pre) => {
            if (pre?.game)
              pre.game.status = 1;
            return pre
          })
        }
      })
    }
  }, [user]);
  const updateSession = useCallback((app: string, session: { token: string; status: number }) => {
    setSessions(pre => ({ ...pre, [app]: session }))
  }, []);
  const refreshToken = useCallback(({ uid, token }: { uid: string, token: string }) => {
    convex.action(api.service.AuthManager.refreshToken, { uid, token }).then(u => {
      if (u?.uid && u?.token) {
        const userId = u.uid;
        const userToken = u.token;
        const timeout = u.expire ? u.expire - 10000 : 50000;
        console.log("timeout", timeout);
        setTimeout(() => refreshToken({ uid: userId, token: userToken }), timeout);
        u.expire = timeout + Date.now();
        localStorage.setItem("user", JSON.stringify(u));
        setUser((pre) => pre && pre.uid === u.uid ? Object.assign(pre, u) : u)
      } else
        setUser({})
      setSessions({});
    });
  }, [sessions]);
  useEffect(() => {
    const userJSON = localStorage.getItem("user");

    if (userJSON !== null) {
      const userObj = JSON.parse(userJSON);
      const { uid, token, expire } = userObj;

      if (uid && token && (!expire || expire > Date.now())) {
        refreshToken({ uid, token });
      } else {
        localStorage.removeItem("user");
        setUser({});
      }
    } else {
      setUser({});
    }
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
  const value = { user, authComplete, logout, sessions, updateSession, events, updateLoaded };
  return (<UserContext.Provider value={value}>{children}</UserContext.Provider>);
};
export const useUserManager = () => {
  return useContext(UserContext);
};
export default UserProvider;
