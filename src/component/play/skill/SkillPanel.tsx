import React, { FunctionComponent, useEffect, useState } from "react";
import styled from "styled-components";
const Diamond = styled.div`
  position: relative;
  left: -10px;
  width: 25px;
  height: 25px;
  background-image: url("icons/diamond_gold.svg");
  background-size: cover;
`;
const SkillPanel: FunctionComponent = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prevProgress) => {
        if (prevProgress >= 100) return 100;
        return prevProgress + 10;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{ display: "flex", width: "100%", height: "100%", justifyContent: "center", alignItems: "center" }}
    ></div>
  );
};

export default SkillPanel;
