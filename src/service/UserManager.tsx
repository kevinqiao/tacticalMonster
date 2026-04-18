
import { useConvex } from "convex/react";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../convex/sso/convex/_generated/api";
import { ModalItem } from "./ModalManager";
import { PageItem } from "./PageManager";

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
  askAuth: ({ page, modal }: { page?: PageItem; modal?: ModalItem }) => void;
  cancelAuth: () => void;
  authReq: { page?: PageItem; modal?: ModalItem } | null;
  authComplete: (user: any, persist: number) => void;
  logout: () => Promise<void>;

}

const UserContext = createContext<IUserContext>({
  user: null,
  askAuth: () => { },
  cancelAuth: () => { },
  authReq: null,
  logout: async () => { },
  authComplete: (user: any, persist: number) => null,

});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReq, setAuthReq] = useState<{ page?: PageItem; modal?: ModalItem } | null>(null);

  const convex = useConvex();

  const askAuth = useCallback(({ page, modal }: { page?: PageItem; modal?: ModalItem }) => {
    if (!user?.uid) {
      setAuthReq({ page, modal })
    }
  }, [user]);

  const cancelAuth = useCallback(() => {
    setAuthReq(null);
  }, [user, authReq]);
  const authComplete = useCallback((u: any, persist: number) => {
    console.log("authComplete", u);
    u.expire = u.expire + Date.now();
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
  }, []);


  const logout = useCallback(async () => {

    if (user?.uid && user?.token) {
      const result = await convex.action(api.service.AuthManager.signOut, { uid: user?.uid, token: user?.token })
      if (result) {
        localStorage.removeItem("user");
        setUser({});
        // setSessions([...sessions])
      }
    }
  }, [user]);




  useEffect(() => {

    const authByToken = async (uid: string, token: string) => {
      try {
        const u = await convex.action(api.service.AuthManager.authByToken, { uid, token });
        if (u?.uid && u?.token) {
          setTimeout(() => { authComplete(u, 1); }, 500);
        } else {
          localStorage.removeItem("user");
          setTimeout(() => { setUser({}); }, 500);
        }
      } catch (err) {
        console.warn("[authByToken] auth failed, clearing session", err);
        localStorage.removeItem("user");
        setTimeout(() => { setUser({}); }, 500);
      }
    }
    const userJSON = localStorage.getItem("user");
    if (userJSON !== null) {
      const userObj = JSON.parse(userJSON);
      console.log("UserProvider", userObj)
      const { uid, token } = userObj;
      if (uid && token) {
        authByToken(uid, token);
      }
    } else {
      setTimeout(() => { setUser({}); }, 500);
    }


  }, []);



  const value = { user, authComplete, logout, askAuth, cancelAuth, authReq };
  return (<UserContext.Provider value={value}>{children}</UserContext.Provider>);
};
export const useUserManager = () => {
  return useContext(UserContext);
};
export default UserProvider;
