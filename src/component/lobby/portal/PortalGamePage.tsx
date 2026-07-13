import React, { useLayoutEffect } from "react";

import { PageProp } from "host/RenderApp";
import { parsePortalPathFromPathname } from "@/host/util/portalPathParse";

import PortalGame3DPage from "./3d/PortalGame3DPage";
import {
  isValidPortalGameType,
  PortalProvider,
} from "./service/usePortalManager";
import { PortalDocumentStylesProvider } from "./usePortalDocumentStyles";

const PortalGamePage: React.FC<PageProp> = ({ visible, data }) => {
  const raw = data?.gameType ?? data?.params?.gameType;
  const fromPath =
    typeof window !== "undefined"
      ? parsePortalPathFromPathname(window.location.pathname).gameType ?? undefined
      : undefined;
  const gameTypeRaw = (typeof raw === "string" ? raw : fromPath) ?? "";
  const gameType = isValidPortalGameType(gameTypeRaw) ? gameTypeRaw : null;

  useLayoutEffect(() => {
    const root = document.getElementById("root");
    if (root) {
      const oldBg = root.style.backgroundColor;
      root.style.backgroundColor = "transparent";
      return () => {
        root.style.backgroundColor = oldBg;
      };
    }
  }, []);

  return (
    // 弹窗（排行榜/规则/商店）渲染在 light DOM，需 document 级主题 CSS；
    // Provider 会等样式就绪后再允许 PortalCenterModal 首帧绘制。
    <PortalDocumentStylesProvider>
      <PortalProvider gameType={gameType}>
        <PortalGame3DPage visible={visible} />
      </PortalProvider>
    </PortalDocumentStylesProvider>
  );
};

export default PortalGamePage;
