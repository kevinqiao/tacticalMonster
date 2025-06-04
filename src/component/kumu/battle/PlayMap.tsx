import { PageProp } from "component/RenderApp";
import React, { useCallback } from "react";
import { PageItem, usePageManager } from "service/PageManager";

const PlayMap: React.FC<PageProp> = ({ visible }) => {

  const { openPage } = usePageManager();
  const openPlay = useCallback(() => {
    // if (visible > 0) {
    console.log("openPlay", visible)
    const page: PageItem = { uri: "/play/lobby/c2" };
    openPage(page);
    // }
  }, [openPage, visible])
  return (<div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      height: "100%",
      backgroundColor: "blue",
    }}
  >
    <div style={{ cursor: "pointer", color: "white", height: 30, width: 100 }} onClick={openPlay}>
      {/* {visible > 0 ? "PlayMap" : "Loading..."} */}
      Play
    </div>

  </div>
  );
};
export default PlayMap;
