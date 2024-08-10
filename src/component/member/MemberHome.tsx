import React from "react";
import PageProps from "../../model/PageProps";

const MemberHome: React.FC<PageProps> = (pageProp) => {
  return (
    <div
      style={{
        position: "relative",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        borderRadius: 2,
        backgroundColor: "white",
      }}
      onClick={() => console.log(pageProp)}
    ></div>
  );
};

export default MemberHome;
