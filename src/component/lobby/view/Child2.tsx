import { PageProp } from "component/RenderApp";
import React from "react";
import { useSharedValue } from "service/SharedPageDataManager";

const Header: React.FC = () => {
  const lobbyHeadDimension = useSharedValue("lobby.head.dimension");
  console.log("lobbyHeadDimension", lobbyHeadDimension);
  if (lobbyHeadDimension == null) return null;
  return (
    <div id="header" style={{ width: lobbyHeadDimension.width, height: lobbyHeadDimension.height, backgroundColor: "red" }}></div>
  )
}
const Footer: React.FC = () => {
  const lobbyFooterDimension = useSharedValue("lobby.footer.dimension");
  if (lobbyFooterDimension == null) return null;
  return (
    <div id="footer" style={{ width: lobbyFooterDimension.width, height: lobbyFooterDimension.height, backgroundColor: "green" }}></div>
  )
}

const Child2: React.FC<PageProp> = ({ visible, data }) => {
  const lobbyContentDimension = useSharedValue("lobby.content.dimension");

  return (<div
    style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      width: "100%",
      height: "100%",
    }}
  >
    <Header />
    <div
      id="content"
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "blue",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {lobbyContentDimension != null ? `lobby ratio(shared): ${lobbyContentDimension.width / lobbyContentDimension.height}` : "lobby ratio(shared): -"}
    </div>
    <Footer />
  </div>
  )
};
export default Child2;
