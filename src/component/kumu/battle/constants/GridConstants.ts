import { SVGProps } from 'react';

export const STYLES = {
  row: (size: number, isOdd: boolean): React.CSSProperties => ({
    display: "flex",
    justifyContent: "flex-start",
    marginLeft: isOdd ? `${size / 2}px` : "0",
    marginBottom: `${-size * HEX_RATIO.HEIGHT_TO_WIDTH * 1/4}px`,
  }),
  cell: ({ width, height }: { width: number; height: number }): React.CSSProperties => ({
    position: "relative",
    width: `${width}px`,
    height: `${height}px`,
    margin: 0,
    pointerEvents: "none",
  }),
  svg: (size: number, hexHeight: number): SVGProps<SVGSVGElement> => ({
    width: size,
    height: hexHeight,
    style: {
      width: size,
      height: hexHeight,
    }
  }),
};

export const SCALE_FACTOR = 0.8;
export const HEX_HEIGHT_RATIO = 1;
export const HEX_RATIO = {
  HEIGHT_TO_WIDTH: 2 / Math.sqrt(3),  // 高宽比
  SIDE_TO_WIDTH: 1 / Math.sqrt(3),    // 边长与宽度比
}; 

export const CHARACTER_SCALE = 0.7;