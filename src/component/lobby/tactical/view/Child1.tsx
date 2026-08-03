import { PageProp } from "host/RenderApp";
import { useFooterNavIsDesktop } from "component/lobby/tactical/control/footer/FooterNavIsDesktop";
import React, { useRef } from "react";
import TournamentHome from "../tournament/TournamentHome";
import "./style.css";
import { useLobbySlideChildSwipe } from "./useLobbySlideChildSwipe";

const Child1: React.FC<PageProp> = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const isDesktop = useFooterNavIsDesktop();
  useLobbySlideChildSwipe(rootRef, { enabled: !isDesktop });

  return (
    <div
      ref={rootRef}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "yellow",
      }}
    >
      <TournamentHome />
    </div>
  );
};

export default Child1;
