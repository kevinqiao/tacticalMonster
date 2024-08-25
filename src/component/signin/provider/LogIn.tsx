import PageProps from "model/PageProps";
import React from "react";

const LogIn: React.FC<PageProps> = (pageProp) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100vh",
        backgroundColor: "black",
      }}
    >
      <div style={{ fontSize: "20px", color: "blue" }}>Welcome!</div>
    </div>
  );
};

export default LogIn;
