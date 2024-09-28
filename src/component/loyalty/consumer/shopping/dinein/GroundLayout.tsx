import React from "react";
import { useTerminal } from "service/TerminalManager";
import SlideControl from "./SlideControl";
import SoloControl from "./SoloControl";

const GroundLayout: React.FC = () => {
  const { terminal, direction } = useTerminal();
  return <>{terminal > 1 ? <SlideControl /> : <SoloControl />}</>;
};
export default GroundLayout;
