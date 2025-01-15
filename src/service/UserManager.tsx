import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getURIParam } from "util/PageUtils";


interface IUserContext {
  user: any;
  authComplete: (user: any, persist: number) => void;
  logout: () => void;
}

const UserContext = createContext<IUserContext>({
  user: null,
  logout: () => null,
  authComplete: (user: any, persist: number) => null,
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);

  console.log("user provider");

  const authComplete = useCallback((u: any, persist: number) => {
    setUser(u);
    if (u?.uid && persist > 0) localStorage.setItem("user", JSON.stringify(u));
    else localStorage.removeItem("user");
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
          authComplete(u ?? {}, 1);
        }
      } else authComplete({}, 0);
    };

    const uid = getURIParam("u");
    const token = getURIParam("t");
    const persist = getURIParam("p");

  }, []);
  return (
    <>
      <UserContext.Provider value={{ user, authComplete, logout }}>{children}</UserContext.Provider>
    </>
  );
};
export const useUserManager = () => {
  return useContext(UserContext);
};
export default UserProvider;
