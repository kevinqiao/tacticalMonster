import React from "react";
import { DialogProps } from "../MenuDialog";

const HowToPlay: React.FC<DialogProps> = ({ width, height }) => {
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          width: "100%",
          height: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: width,
            height: height,
            backgroundColor: "white",
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {"Menu-How To Play"}
        </div>
      </div>
    </>
  );
};

export default HowToPlay;
