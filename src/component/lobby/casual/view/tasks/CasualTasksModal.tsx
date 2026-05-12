import { ModalProp } from "host/service/ModalManager";
import React from "react";

import "../shared/casualEconomyPages.css";
import CasualTasksPanel from "./CasualTasksPanel";
import "./casualTasksModal.css";

/** Play 页侧栏：任务列表，swipeRight 动画由 PageConfiguration 定义 */
const CasualTasksModal: React.FC<ModalProp> = ({ visible }) => {
  if (!visible) return null;
  return (
    <div className="casual-tasks-modal">
      <CasualTasksPanel />
    </div>
  );
};

export default CasualTasksModal;
