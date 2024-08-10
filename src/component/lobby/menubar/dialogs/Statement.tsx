import React from "react";
import { DialogProps } from "../MenuDialog";

const Statement: React.FC<DialogProps> = ({ width, height }) => {
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
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
          {"Menu-Statement"}
        </div>
      </div>
    </>
  );
};

export default Statement;
