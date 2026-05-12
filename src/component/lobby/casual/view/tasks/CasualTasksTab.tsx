import { PageProp } from "host/RenderApp";
import React, { useRef } from "react";

import "../shared/casualEconomyPages.css";
import CasualPageShell from "../shell/CasualPageShell";
import CasualTasksPanel from "./CasualTasksPanel";

/** 任务 Tab：展示 Convex `listSeasonMissions` 合并后的真实进度与领取 */
const CasualTasksTab: React.FC<PageProp> = ({ visible }) => {
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <CasualPageShell
      title="任务"
      titleId="casual-tab-tasks"
      rootRef={rootRef}
      visible={visible}
      showHeader
    >
      <CasualTasksPanel />
    </CasualPageShell>
  );
};

export default CasualTasksTab;
