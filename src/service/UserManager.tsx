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
  useEffect(() => {
    console.log("userEvents", userEvents);
    if (Array.isArray(userEvents) && userEvents.length > 0) {
      const event = userEvents[userEvents.length - 1] as Event;
      setLastTime(event.time);
      if (event.name !== "####") {
        const events: Event[] = userEvents;
        for (const e of events) {
          if (e.name === "GameCreated" && e.data?.gameId) {
            if (user?.uid) {
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
        }
        setEvents(userEvents);
      }
    }
  }, [userEvents]);
  const authComplete = useCallback((u: any, persist: number) => {
    console.log("expire:", u.expire - Date.now())
    if (persist > 0) {
      console.log("persist", u)
      localStorage.setItem("user", JSON.stringify(u));
    }
    setUser(u);
    setSessions({})
  }, []);

  const logout = useCallback(() => {
    if (user?.uid && user?.token) {
      convex.action(api.service.AuthManager.logout, { uid: user?.uid, token: user?.token }).then(result => {
        if (result) {
          localStorage.removeItem("user");
          setUser(null);
          setSessions({});
        }
      });
    }
  }, [user]);
  const updateSession = useCallback((app: string, session: { token: string; status: number }) => {
    setSessions((pre) => {
      const s = pre[app]
      if (s) {
        s.token = session.token
        s.status = session.status
        return { ...pre }
      }
      return pre
    })
  }, []);
  useEffect(() => {

    const userJSON = localStorage.getItem("user");
    if (userJSON !== null) {
      const userObj = JSON.parse(userJSON);
      const { uid, token, expire } = userObj;
      if (uid && token && (!expire || expire > Date.now())) {
        convex.action(api.service.AuthManager.refreshToken, { uid, token }).then(u => {
          console.log("refresh", u);
          if (u) {
            const expire = u.expire ? u.expire + Date.now() : 0;
            localStorage.setItem("user", JSON.stringify({ ...u, expire }));
            setUser(u)
          } else
            setUser(null)
        });
      } else {
        localStorage.removeItem("user");
        setUser({});
      }
    } else {
      setUser({});
    }


  }, []);
  const value = { user, authComplete, logout, sessions, updateSession, events };
  return (
    <>
      <UserContext.Provider value={value}>{children}</UserContext.Provider>
    </>
  );
};
export const useUserManager = () => {
  return useContext(UserContext);
};
export default UserProvider;
