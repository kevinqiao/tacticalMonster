import React, { useEffect, useMemo, useState } from "react";

import {
  computePortalViewportLayout,
  type ViewportLayout,
} from "./viewportLayout";
import "./portalViewportShell.css";

type PortalViewportShellProps = {
  children: React.ReactNode;
  /**
   * 竖屏 Portal 设计稿。省略时按窗口宽高比自动判断（勿默认 false，否则手机竖屏会卡在 1440×1080）。
   */
  portrait?: boolean;
  leftBanner?: React.ReactNode;
  rightBanner?: React.ReactNode;
};

function useViewportLayout(portrait?: boolean): ViewportLayout {
  const [layout, setLayout] = useState(() =>
    typeof window !== "undefined"
      ? computePortalViewportLayout({
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          portrait,
        })
      : computePortalViewportLayout({ windowWidth: 1440, windowHeight: 1080, portrait })
  );

  useEffect(() => {
    const onResize = () => {
      setLayout(
        computePortalViewportLayout({
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          portrait,
        })
      );
    };
    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [portrait]);

  return layout;
}

/** 宽屏左右 gutter 承载展示广告；游戏 stage 居中不缩放设计区。 */
export function PortalViewportShell({
  children,
  portrait,
  leftBanner,
  rightBanner,
}: PortalViewportShellProps) {
  const layout = useViewportLayout(portrait);

  const stageStyle = useMemo(
    () => ({
      width: `${layout.stageRect.w}px`,
      height: `${layout.stageRect.h}px`,
    }),
    [layout.stageRect.h, layout.stageRect.w]
  );

  const leftStyle = layout.gutters.left
    ? {
        width: `${layout.gutters.left.w}px`,
      }
    : undefined;

  const rightStyle = layout.gutters.right
    ? {
        width: `${layout.gutters.right.w}px`,
      }
    : undefined;

  return (
    <div className="portal-viewport-shell" data-platform={layout.platform}>
      <div className="portal-viewport-shell__gutter portal-viewport-shell__gutter--left" style={leftStyle}>
        {leftBanner}
      </div>
      <div className="portal-viewport-shell__stage" style={stageStyle}>
        {children}
      </div>
      <div className="portal-viewport-shell__gutter portal-viewport-shell__gutter--right" style={rightStyle}>
        {rightBanner}
      </div>
    </div>
  );
}
