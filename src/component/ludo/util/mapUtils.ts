// 定义一个接口来描述格子坐标


/**
 * 计算两个点之间的直线路径，返回路径上所有的格子坐标
 * @param x0 - 起始格子的 x 坐标
 * @param y0 - 起始格子的 y 坐标
 * @param x1 - 目标格子的 x 坐标
 * @param y1 - 目标格子的 y 坐标
 * @returns { x: number, y: number }[] - 格子坐标数组，格式为 { x, y }
 */
export const getRouteLine = (x0: number, y0: number, x1: number, y1: number): { x: number, y: number }[] => {
  const path: { x: number, y: number }[] = [];
  
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  
  let err = dx - dy;
  
  while (true) {
    
    // 当到达终点时退出循环
    if (x0 === x1 && y0 === y1) break;
    path.push({ x: x0, y: y0 });
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
  
  return path;
}
export const getRoutePath = (points: { x: number, y: number }[][]): { x: number, y: number }[] => {
  const path: { x: number, y: number }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    console.log(points[i])
    if(points[i].length>1){ 
      for(let j=0;j<points[i].length-1;j++){  
          const line = getRouteLine(points[i][j].x, points[i][j].y, points[i + 1][j].x, points[i + 1][j].y);
          path.push(...line);
      }
      path.push(points[i][points[i].length-1])  
    }else{
      path.push(points[i][0])
    }
  }
  return path;
}

// 示例：在15x15的 tilemap 中计算从 (2,3) 到 (10,12) 的直线路径
// const startX = 2, startY = 3;
// const endX = 10, endY = 12;
// const linePath: { x: number, y: number }[] = getRouteLine(startX, startY, endX, endY);

// console.log("直线路径经过的格子：");
// linePath.forEach(cell => console.log(`(${cell.x}, ${cell.y})`));
