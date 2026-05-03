import { PageProp } from "component/RenderApp";
import { useFooterNavIsDesktop } from "component/lobby/tactical/control/footer/FooterNavIsDesktop";
import React, { useRef } from "react";
import { useLobbySlideChildSwipe } from "./useLobbySlideChildSwipe";

const Child3: React.FC<PageProp> = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const isDesktop = useFooterNavIsDesktop();
  useLobbySlideChildSwipe(rootRef, { enabled: !isDesktop });

  return (
    <div
      ref={rootRef}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "green",
      }}
    />
  );
};

export default Child3;
