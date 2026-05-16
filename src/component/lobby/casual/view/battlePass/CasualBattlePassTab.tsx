import { PageProp } from "host/RenderApp";
import React, { useRef } from "react";

import CasualPageShell from "../shell/CasualPageShell";
import CasualBattlePassModal from "./CasualBattlePassModal";

/** 底栏「通行证」全页：与侧栏 Modal 共用 {@link CasualBattlePassModal} 主体 */
const CasualBattlePassTab: React.FC<PageProp> = ({ visible }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  return (
    <CasualPageShell
      title="通行证"
      titleId="casual-tab-battle-pass"
      rootRef={rootRef}
      visible={visible}
      showHeader
    >
      <CasualBattlePassModal visible={Boolean(visible)} close={() => {}} />
    </CasualPageShell>
  );
};

export default CasualBattlePassTab;
