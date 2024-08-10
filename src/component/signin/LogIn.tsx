import { SignIn } from "@clerk/clerk-react";
import PageProps from "model/PageProps";
import React, { useMemo } from "react";

const LogIn: React.FC<PageProps> = (pageProp) => {
  const redirectURL = useMemo(() => {
    const url = pageProp.data?.src
      ? window.location.pathname + "?redirect=" + pageProp.data.src
      : window.location.pathname;
    return url;
  }, [pageProp]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100vh",
        backgroundColor: "white",
      }}
    >
      <div style={{ fontSize: "20px", color: "blue" }}>Welcome!</div>
      <SignIn redirectUrl={redirectURL} afterSignInUrl={redirectURL} />
    </div>
  );
};

export default LogIn;
