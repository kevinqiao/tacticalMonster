import { useConvex } from "convex/react";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../convex/sso/convex/_generated/api";

export interface User {
  uid?: string;
  cid: string;
  partner: number;
  token?: string;
  expire?: number;
  name?: string;
  email?: string;
  phone?: string;
}

interface IUserContext {
  user: any;
  sessions: { [k: string]: { token: string; status: number } };
  updateSession: (app: string, session: { token: string; status: number }) => void;
  authComplete: (user: any, persist: number) => void;
  logout: () => void;
}

const UserContext = createContext<IUserContext>({
  user: null,
  sessions: {},
  updateSession: () => null,
  logout: () => null,
  authComplete: (user: any, persist: number) => null,
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<{ [k: string]: { token: string; status: number } }>({});
  const convex = useConvex();
  const authComplete = useCallback((u: any, persist: number) => {
    console.log("expire:", u.expire - Date.now())
    setUser(u);
    if (persist > 0) {
      console.log("persist", u)
      localStorage.setItem("user", JSON.stringify(u));
    }
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
    // createEvent({ name: "signout", topic: "account", delay: 0 });
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
      if (!expire || expire > Date.now()) {
        convex.action(api.service.AuthManager.refreshToken, { uid, token }).then(u => {
          console.log("refresh", u);
          if (u) {
            const expire = u.expire ? u.expire + Date.now() : 0;
            localStorage.setItem("user", JSON.stringify({ ...u, expire }));
            setSessions({});
            setUser(u);
          }
        });
      } else {
        localStorage.removeItem("user");
        setUser(null);
        setSessions({});
      }
    }


  }, []);
  return (
    <>
      <UserContext.Provider value={{ user, authComplete, logout, sessions, updateSession }}>{children}</UserContext.Provider>
    </>
  );
};
export const useUserManager = () => {
  return useContext(UserContext);
};
export default UserProvider;
