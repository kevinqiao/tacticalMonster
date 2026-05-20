import { PageProp } from "host/RenderApp";
import React, { useRef } from "react";

import CasualPageShell from "../shell/CasualPageShell";
import CasualTownView from "./CasualTownView";

const CasualTownTab: React.FC<PageProp> = ({ visible }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  return (
    <CasualPageShell
      title="My Town"
      titleId="casual-tab-town"
      rootRef={rootRef}
      visible={visible}
      showHeader
    >
      <CasualTownView />
    </CasualPageShell>
  );
};

export default CasualTownTab;
