import { PageProp } from "host/RenderApp";
import React, { useRef } from "react";

import CasualPageShell from "../shell/CasualPageShell";

/** 遗留页：无报名开局的「单人练习」已下线，请从 Play 报名日榜或锦标。 */
const Child1: React.FC<PageProp> = ({ visible }) => {
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <CasualPageShell title="Solo" titleId="casual-tab-solo" rootRef={rootRef} visible={visible}>
      <p style={{ margin: "0 0 12px", opacity: 0.85, fontSize: 14, lineHeight: 1.5 }}>
        无门票、无经济结算的「单人练习」已下线。请前往 <strong>Play</strong>：报名{" "}
        <strong>日榜单人挑战</strong> 或 <strong>多人竞技</strong>（A/B/C）后再进入对局。
      </p>
    </CasualPageShell>
  );
};

export default Child1;
