import React, { useEffect, useRef, useState } from "react";
interface IconProps {
  //   color: string; // Define the type of the color prop
  date: string;
}
const DateIcon: React.FC<IconProps> = ({ date }) => {
  const divRef = useRef<HTMLDivElement | null>(null);
  const [fontSize, setFontSize] = useState(20);

  const calculateFontSize = () => {
    if (divRef.current) {
      const divWidth = divRef.current.offsetWidth;
      const newFontSize = divWidth / 9; // 示例计算方法
      setFontSize(newFontSize);
    }
  };

  useEffect(() => {
    calculateFontSize();
    window.addEventListener("resize", calculateFontSize);

    return () => {
      window.removeEventListener("resize", calculateFontSize);
    };
  }, []);
  return (
    <div
      ref={divRef}
      style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", width: "100%", height: "100%" }}
    >
      <svg id="Layer_1" width="20%" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <g clipRule="evenodd" fillRule="evenodd">
          <path
            d="m256 47c-115.238 0-209.002 93.759-209.002 209.003 0 115.248 93.764 208.997 209.002 208.997s209.002-93.749 209.002-208.997c.001-115.244-93.764-209.003-209.002-209.003zm0 449.999c-64.378 0-124.902-25.07-170.409-70.577-45.522-45.522-70.592-106.041-70.592-170.419 0-64.373 25.07-124.892 70.593-170.414 45.506-45.517 106.03-70.588 170.408-70.588 64.368 0 124.887 25.071 170.409 70.587 45.522 45.522 70.593 106.041 70.593 170.414 0 64.378-25.071 124.897-70.593 170.419-45.522 45.508-106.041 70.578-170.409 70.578z"
            fill="#ffb229"
          />
          <path
            d="m181.832 344.003c-4.173 0-8.342-1.621-11.482-4.852-6.159-6.336-6.002-16.47.339-22.629l69.311-67.28v-127.653c0-8.838 7.161-16 16-16 8.843 0 16 7.161 16 16v134.414c0 4.33-1.748 8.468-4.862 11.477l-74.169 72.001c-3.099 3.018-7.121 4.522-11.137 4.522z"
            fill="#434b66"
          />
        </g>
      </svg>
      <div style={{ width: "80%", overflow: "hidden", whiteSpace: "nowrap" }}>
        <span style={{ fontSize }}>{date}</span>
      </div>
    </div>
  );
};

export default DateIcon;
