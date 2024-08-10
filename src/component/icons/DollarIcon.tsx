import React, { useEffect, useRef, useState } from "react";
interface IconProps {
  //   color: string; // Define the type of the color prop
  amount: number;
  vertical?: number;
}
const DollarIcon: React.FC<IconProps> = ({ amount, vertical }) => {
  const divRef = useRef<HTMLDivElement | null>(null);
  const [fontSize, setFontSize] = useState(20);

  const calculateFontSize = () => {
    if (divRef.current) {
      const divWidth = divRef.current.offsetWidth;
      const newFontSize = divWidth / 6; // 示例计算方法
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
      style={{
        display: "flex",
        flexDirection: vertical ? "column" : "row",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
      }}
    >
      <div style={{ width: "40%", maxWidth: 50 }}>
        <svg
          id="Layer_2_00000044855974950838135340000015365907571071736990_"
          enableBackground="new 0 0 512 512"
          viewBox="0 0 512 512"
          xmlns="http://www.w3.org/2000/svg"
        >
          <linearGradient id="lg1">
            <stop offset="0" stopColor="#aeed64" />
            <stop offset="1" stopColor="#78c918" />
          </linearGradient>
          <linearGradient
            id="SVGID_1_"
            gradientTransform="matrix(1 0 0 -1 0 514)"
            gradientUnits="userSpaceOnUse"
            x1="59.465"
            x2="452.536"
            xlinkHref="#lg1"
            y1="454.536"
            y2="61.465"
          />
          <linearGradient id="lg2">
            <stop offset="0" stopColor="#53ab46" />
            <stop offset="1" stopColor="#107300" />
          </linearGradient>
          <linearGradient
            id="SVGID_00000032645776979044537540000006962926026842039723_"
            gradientTransform="matrix(1 0 0 -1 0 514)"
            gradientUnits="userSpaceOnUse"
            x1="88"
            x2="424"
            xlinkHref="#lg2"
            y1="426"
            y2="90"
          />
          <linearGradient
            id="SVGID_00000022555318245107289290000012810693641758412441_"
            gradientTransform="matrix(1 0 0 -1 0 514)"
            gradientUnits="userSpaceOnUse"
            x1="129.284"
            x2="382.721"
            xlinkHref="#lg1"
            y1="384.721"
            y2="131.284"
          />
          <linearGradient
            id="SVGID_00000072261002200606058080000015812546576975500964_"
            gradientTransform="matrix(1 0 0 -1 0 514)"
            gradientUnits="userSpaceOnUse"
            x1="202.967"
            x2="309.033"
            xlinkHref="#lg2"
            y1="311.033"
            y2="204.967"
          />
          <linearGradient
            id="SVGID_00000074432508636419634450000004230927247264305567_"
            gradientTransform="matrix(1 0 0 -1 0 514)"
            gradientUnits="userSpaceOnUse"
            x1="378.822"
            x2="414.178"
            xlinkHref="#lg2"
            y1="275.678"
            y2="240.322"
          />
          <linearGradient
            id="SVGID_00000095306814470749097720000016877201791931606422_"
            gradientTransform="matrix(1 0 0 -1 0 514)"
            gradientUnits="userSpaceOnUse"
            x1="97.822"
            x2="133.178"
            xlinkHref="#lg2"
            y1="275.678"
            y2="240.322"
          />
          <linearGradient
            id="Icon-2_00000087389561179849860330000004403584531619205514_"
            gradientTransform="matrix(1 0 0 -1 0 514)"
            gradientUnits="userSpaceOnUse"
            x1="228.408"
            x2="285.582"
            xlinkHref="#lg1"
            y1="287.672"
            y2="230.488"
          />
          <g id="Icon">
            <g id="Dollar">
              <g id="Money">
                <path
                  d="m5 116h502c2.8 0 5 2.2 5 5v270c0 2.8-2.2 5-5 5h-502c-2.8 0-5-2.2-5-5v-270c0-2.8 2.2-5 5-5z"
                  fill="url(#SVGID_1_)"
                />
                <path
                  d="m30 146h452v220h-452z"
                  fill="url(#SVGID_00000032645776979044537540000006962926026842039723_)"
                />
                <path
                  d="m462 210.6v90.7c0 3.1-2.7 5.4-5.8 4.9-7.9-1.1-16.8.9-25.6 7-7.2 9-9.5 18.6-8.3 27 .4 3-1.9 5.7-4.9 5.7h-322.8c-3.1 0-5.4-2.7-4.9-5.7 1.2-8.4-1.1-18-8.3-27-8.9-6.1-17.7-8.1-25.6-7-3 .4-5.8-1.9-5.8-4.9v-90.7c0-3.1 2.7-5.4 5.8-4.9 7.9 1.1 16.8-.9 25.6-7 7.2-9 9.5-18.6 8.3-27-.4-3 1.9-5.7 4.9-5.7h322.7c3 0 5.4 2.7 4.9 5.7-1.2 8.4 1.1 18 8.3 27 8.9 6.1 17.7 8.1 25.6 7 3.2-.4 5.9 1.9 5.9 4.9z"
                  fill="url(#SVGID_00000022555318245107289290000012810693641758412441_)"
                />
                <circle
                  cx="256"
                  cy="256"
                  fill="url(#SVGID_00000072261002200606058080000015812546576975500964_)"
                  r="75"
                />
                <circle
                  cx="396.5"
                  cy="256"
                  fill="url(#SVGID_00000074432508636419634450000004230927247264305567_)"
                  r="25"
                />
                <circle
                  cx="115.5"
                  cy="256"
                  fill="url(#SVGID_00000095306814470749097720000016877201791931606422_)"
                  r="25"
                />
              </g>
              <path
                id="Icon-2"
                d="m264.6 274.4c0-3-.7-5.3-2.2-6.9s-4-3.3-7.7-4.8-7-3-10.1-4.5-5.8-3.3-8-5.3-4-4.4-5.1-7c-1.2-2.6-1.8-5.9-1.8-9.6 0-6.3 2.1-11.5 6.4-15.6s9.9-6.5 17-7.1v-11.8h8.9v12c6.8 1 12.2 3.8 16.1 8.4s5.9 10.5 5.9 17.6h-19c0-3.9-.8-6.9-2.2-9s-3.6-3.1-6.4-3.1c-2.5 0-4.4.8-5.7 2.3-1.4 1.6-2 3.7-2 6.4s.8 5 2.4 6.6 4.1 3.2 7.6 4.6 6.8 3 9.8 4.6c3.1 1.6 5.7 3.4 8 5.4 2.2 2 4 4.4 5.3 7.1s1.9 5.9 1.9 9.7c0 6.4-2 11.6-6.1 15.6-4 4-9.6 6.4-16.5 7.1v11.3h-9.1v-11.3c-8.1-.9-14.4-3.6-18.7-8.4-4.4-4.7-6.5-10.9-6.5-18.7h18.9c0 4.3.9 7.5 2.8 9.7s4.6 3.3 8 3.3c2.5 0 4.5-.8 6-2.3s2.1-3.7 2.1-6.3z"
                fill="url(#Icon-2_00000087389561179849860330000004403584531619205514_)"
              />
            </g>
          </g>
        </svg>
      </div>
      <div>
        <span style={{ fontSize: Math.min(fontSize, 18), color: "white" }}>{amount}</span>
      </div>
    </div>
  );
};

export default DollarIcon;
