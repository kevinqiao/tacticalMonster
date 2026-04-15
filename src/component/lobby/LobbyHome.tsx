import { PageProp } from "component/RenderApp";
import React, { useEffect, useRef } from "react";
import { useSharedPageData } from "service/SharedPageDataManager";
import "./style.css";
const LobbyHome: React.FC<PageProp> = ({ visible }) => {
  const lobbyRef = useRef<HTMLDivElement | null>(null);
  const headRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const { setShared } = useSharedPageData();
  // const contentAspectRatio = useSharedValue("lobby.contentRatio");

  useEffect(() => {
    const ele = lobbyRef.current;
    if (!ele) return;

    const updateRatio = () => {
      const lobbyDimension = ele.getBoundingClientRect();
      const headDimension = headRef.current?.getBoundingClientRect();
      const footerDimension = footerRef.current?.getBoundingClientRect();
      const contentDimension = contentRef.current?.getBoundingClientRect();
      setShared("lobby.dimension", lobbyDimension ? { width: lobbyDimension.width, height: lobbyDimension.height } : null);
      setShared("lobby.head.dimension", headDimension ? { width: headDimension.width, height: headDimension.height } : null);
      setShared("lobby.footer.dimension", footerDimension ? { width: footerDimension.width, height: footerDimension.height } : null);
      setShared("lobby.content.dimension", contentDimension ? { width: contentDimension.width, height: contentDimension.height } : null);
      // const width = ele.clientWidth;
      // const height = ele.clientHeight;
      // if (height <= 0) return;
      // setShared("lobby.contentRatio", width / height);
    };

    updateRatio();
    const observer = new ResizeObserver(updateRatio);
    observer.observe(ele);
    return () => {
      observer.disconnect();
      setShared("lobby.dimension", null);
      setShared("lobby.head.dimension", null);
      setShared("lobby.footer.dimension", null);
      setShared("lobby.content.dimension", null);
    };
  }, [setShared]);

  return (<div
    ref={lobbyRef}
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      width: "100%",
      height: "100%",
    }}
  >
    <div id="header" ref={headRef} style={{ width: "100%", height: "7%", backgroundColor: "red" }}></div>
    <div
      id="content"
      ref={contentRef}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "transparent",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >

    </div>
    <div id="footer" ref={footerRef} style={{ width: "100%", height: "5%", backgroundColor: "green" }}></div>
    {/* <div ref={bottomRef} className="lobby-bottom-container">
      <LobbyNavControl />
    </div> */}
  </div>
  )

};

export default LobbyHome;
