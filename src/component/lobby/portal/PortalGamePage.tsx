import React, { useLayoutEffect } from "react";

import { PageProp } from "host/RenderApp";
import { parsePortalPathFromPathname } from "@/host/util/portalPathParse";

import PortalGame3DPage from "./3d/PortalGame3DPage";
import {
  isValidPortalGameType,
  PortalProvider,
} from "./service/usePortalManager";
import { usePortalDocumentStyles } from "./usePortalDocumentStyles";

const PortalGamePage: React.FC<PageProp> = ({ visible, data }) => {
  // 弹窗（排行榜/规则/商店）渲染在 light DOM，需要 document 级 portal.css
  usePortalDocumentStyles();
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
    <PortalProvider gameType={gameType}>
      <PortalGame3DPage visible={visible} />
    </PortalProvider>
  );
};

export default PortalGamePage;
