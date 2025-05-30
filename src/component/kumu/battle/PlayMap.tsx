import { PageProp } from "component/RenderApp";
import { PageItem } from "model/PageProps";
import React, { useCallback } from "react";
import { usePageManager } from "service/PageManager";

const PlayMap: React.FC<PageProp> = ({ visible, data }) => {

  const { openPage } = usePageManager();
  const openPlay = useCallback(() => {
    const page: PageItem = { uri: "/play/lobby/c2" };
    openPage(page);
  }, [openPage])
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
      PlayMap
    </div>

  </div>
  );
};
export default PlayMap;
