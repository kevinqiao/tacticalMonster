import { gsap } from "gsap";
import React, { useEffect } from "react";
import { usePageManager } from "../../service/PageManager";
import useCoord from "../../service/TerminalManager";
import "./menu.css";
const colors = ["red", "green", "blue", "orange", "white"];
const iconCoords = [
  { id: 0, x: 40, y: 25, w: 25, h: 25 },
  { id: 1, x: 140, y: 25, w: 25, h: 25 },
  { id: 2, x: 240, y: 25, w: 25, h: 25 },
  { id: 3, x: 340, y: 25, w: 25, h: 25 },
  { id: 4, x: 440, y: 25, w: 25, h: 25 },
];

const pageIndexs = [
  { name: "membership", index: 0 },
  { name: "reward", index: 1 },
  { name: "transaction", index: 2 },
  { name: "help", index: 3 },
  { name: "market", index: 4 },
];
const MemberMenu: React.FC = () => {
  const coord = useCoord();
  const { currentPage, openPage } = usePageManager();

  // useEffect(() => {
  //   if (prevPage) {
  //     // const preicon = "#men-" + preIndexRef.current;
  //     // gsap.to(preicon, { y: 0, duration: 1 });
  //     const premenu = "#menu-" + prevPage.name;
  //     gsap.to(premenu, { fill: "grey", duration: 1 });
  //   }
  // }, [prevPage]);
  useEffect(() => {
    if (currentPage) {
      const curmenu = "#menu-" + currentPage.name;

      setTimeout(() => {
        gsap.to(curmenu, { fill: "red", duration: 0.7 });
      }, 100);
    }
  }, [currentPage]);

  return (
    <>
      {coord.width ? (
        <div
          id="pixi-container"
          className="menu-pixi"
          style={{
            width: coord.LobbyMenuW,
            height: coord.LobbyMenuH,
            backgroundColor: "white",
          }}
        >
          <svg viewBox="0 0 500 50" preserveAspectRatio="xMinYMin meet">
            {/* <defs>
              <pattern id="leaderboardimage" patternUnits="userSpaceOnUse" width="100" height="100">
                <rect x="0" y="0" width="150" height="100" fill={selected === "option1" ? "blue" : "gray"} />
                <image x="25" y="10" width="25" height="25" href={myImage} />
              </pattern>
            </defs> */}
            {/* 不规则形状1 */}
            <polygon
              id="menu-membership"
              points="0,0 100,0 75,50 0,50"
              fill={"grey"}
              // fill="url(#leaderboardimage)"
              stroke="white"
              strokeWidth={1}
            />

            {/* 不规则形状2 */}
            <polygon id="menu-reward" points="100,0 200,0 175,50 75,50" fill={"grey"} stroke="white" strokeWidth={1} />

            {/* 不规则形状3 */}
            <polygon
              id="menu-transaction"
              points="200,0 300,0 275,50 175,50"
              fill={"grey"}
              stroke="white"
              strokeWidth={1}
            />
            {/* 不规则形状4 */}
            <polygon id="menu-help" points="300,0 400,0 375,50 275,50" fill={"grey"} stroke="white" strokeWidth={1} />
            {/* 不规则形状5 */}
            <polygon id="menu-market" points="400,0 500,0 500,50 375,50" fill={"grey"} stroke="white" strokeWidth={1} />
          </svg>

          {/* {iconCoords
            .map((c, index) => {
              const w = Math.floor((c.w * coord.mainMenuRatio) / 1.5);
              const h = Math.floor((c.h * coord.mainMenuRatio) / 1.5);
              const x = Math.floor(c.x * coord.mainMenuRatio) - Math.floor(w / 2);
              const y = Math.floor(c.y * coord.mainMenuRatio) - Math.floor(h / 2);
              return {
                id: c.id,
                x,
                y,
                w,
                h,
              };
            })
            .map((c) => (
              <img
                key={"menu-icon-" + c.id}
                id={"menu-icon-" + c.id}
                style={{ position: "absolute", width: c.w, height: c.h, left: c.x, bottom: c.y, pointerEvents: "none" }}
                src="assets/boy.png"
              />
            ))} */}
        </div>
      ) : null}
    </>
  );
};

export default MemberMenu;
