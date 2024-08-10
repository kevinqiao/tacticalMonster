import React, { useEffect } from "react";
import { useUserManager } from "service/UserManager";
import { useAuthorize } from "../useAuthorize";
const CustomProvider: React.FC<{ provider: string }> = ({ provider }) => {
  const { authComplete } = useUserManager();
  useEffect(() => {
    const src = "https://telegram.org/js/telegram-web-app.js";
  
  }, []);

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100vh",
          backgroundColor: "black",
        }}
      >
        <div style={{ fontSize: "20px", color: "blue" }}>Authenticating...</div>
      </div>
    </>
  );
};

export default CustomProvider;
