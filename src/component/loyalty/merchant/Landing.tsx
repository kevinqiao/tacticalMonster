import React, { useCallback } from "react";
import useEventSubscriber from "service/EventManager";
import { usePageManager } from "service/PageManager";
import { useUserManager } from "service/UserManager";
import PageProps from "../../../model/PageProps";

const Landing: React.FC<PageProps> = (pageProp) => {
  const { openPage } = usePageManager();
  const { user, logout } = useUserManager();
  const { createEvent } = useEventSubscriber([], []);

  const signin = useCallback(() => {
    createEvent({ name: "signin", topic: "account", delay: 0 });
  }, [createEvent]);
  const signout = useCallback(() => {
    logout();
  }, []);
  const openHome = useCallback(() => {
    openPage({ name: "home", app: "merchant" });
  }, []);
  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "100vw",
          height: "100vh",
          color: "blue",
        }}
      >
        <div
          style={{
            cursor: "pointer",
            width: "200px",
            height: "40px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "blue",
            color: "white",
          }}
          onClick={openHome}
        >
          Home
        </div>
        {user ? (
          <>
            <div
              style={{
                cursor: "pointer",
                width: "200px",
                height: "40px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "blue",
                color: "white",
              }}
              onClick={signout}
            >
              Logout
            </div>
          </>
        ) : (
          <div
            style={{
              cursor: "pointer",
              width: "200px",
              height: "40px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "blue",
              color: "white",
            }}
            onClick={signin}
          >
            Sign In
          </div>
        )}
      </div>
    </>
  );
};
export default Landing;
