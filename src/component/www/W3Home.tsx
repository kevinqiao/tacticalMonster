import React, { useEffect, useMemo } from "react";
import useCoord from "service/TerminalManager";
import PageProps from "../../model/PageProps";
import "./www.css";
const W3Home: React.FC<PageProps | null> = (prop) => {
  const { width, height } = useCoord();

  useEffect(() => {
    const messageHandler = (event: any) => {
      // if (event.origin !== "http://localhost:3000") {
      //   return;
      // }
    };

    window.addEventListener("message", messageHandler);

    return () => {
      window.removeEventListener("message", messageHandler);
    };
  }, []);

  const render = useMemo(() => {
    return (
      <div style={{ position: "relative", width, height, margin: 0, backgroundColor: "blue" }}>
        <iframe
          // src={"https://pixels.xyz"}
          src={"/www/index.html"}
          width={"100%"}
          height={"100%"}
          title={"pixels"}
          style={{ border: "none", margin: "0px 0px 0px 0px" }}
        />

        <div className="play_btn">
          <span style={{ fontSize: 25 }}>Play Now</span>
        </div>
      </div>
    );
  }, [prop, width, height]);
  return <>{render}</>;
};

export default W3Home;
