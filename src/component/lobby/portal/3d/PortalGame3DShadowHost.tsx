import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import portalCssUrl from "../portal.css?url";
import portal3dCssUrl from "./portal_3d.css?url";

const PORTAL_3D_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Nunito:wght@800;900&display=swap";

function appendStylesheet(shadow: ShadowRoot, href: string) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  shadow.appendChild(link);
}

/** 3D 大厅样式只注入 Shadow Root，避免污染 document.head。 */
export function PortalGame3DShadowHost({ children }: { children: React.ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [mountEl, setMountEl] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || host.shadowRoot) return;

    const shadow = host.attachShadow({ mode: "open" });

    const hostStyle = document.createElement("style");
    hostStyle.textContent =
      ":host{display:block;width:100%;height:100%;overflow:hidden;contain:strict;}";
    shadow.appendChild(hostStyle);

    appendStylesheet(shadow, PORTAL_3D_FONT_HREF);
    appendStylesheet(shadow, portalCssUrl);
    appendStylesheet(shadow, portal3dCssUrl);

    const mount = document.createElement("div");
    mount.style.cssText = "width:100%;height:100%;";
    shadow.appendChild(mount);
    setMountEl(mount);
  }, []);

  return (
    <div ref={hostRef} style={{ width: "100%", height: "100%" }}>
      {mountEl ? createPortal(children, mountEl) : null}
    </div>
  );
}
