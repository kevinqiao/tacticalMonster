import PageProps from "model/PageProps";
import React, { useMemo } from "react";
import useCoord from "service/TerminalManager";
import { useUserManager } from "service/UserManager";

const OrderScan: React.FC<PageProps> = (prop) => {
  const { width, height } = useCoord();
  const { user } = useUserManager();

  const handleCloseWindow = () => {
    window.close();
  };
  const render = useMemo(() => {
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
          }}
        >
          {user ? (
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
              onClick={handleCloseWindow}
            >
              Game Over
            </div>
          ) : null}
        </div>
      </>
    );
  }, [prop, user, height, width]);
  return <>{render}</>;
};

export default OrderScan;
