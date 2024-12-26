import { HEX_RATIO } from '../constants/GridConstants';
import { HexMetrics, HexPoint } from '../types/GridTypes';

/**
 * 计算六边形的关键尺寸
 * @param width 六边形的宽度（两个水平边之间的距离）
 */
export const calculateHexMetrics = (width: number): HexMetrics => {
  const height = width * HEX_RATIO.HEIGHT_TO_WIDTH;
  const sideLength = width * HEX_RATIO.SIDE_TO_WIDTH;
  
  return {
    width,
    height,
    sideLength,
    horizontalRadius: width / 2,
    verticalRadius: height / 2,
  };
};

/**
 * 计算尖角朝上的正六边形的六个顶点坐标
 * @param width 六边形的宽度
 */
export const calculateHexPoints = (width: number): HexPoint[] => {
  const metrics = calculateHexMetrics(width);
  const centerX = metrics.width / 2;
  const centerY = metrics.height / 2;
  
  return [
    // 从顶点开始，顺时针排列
    { x: centerX, y: 0 },                                                    // 上顶点
    { x: centerX + metrics.horizontalRadius, y: centerY - metrics.verticalRadius/2 },  // 右上
    { x: centerX + metrics.horizontalRadius, y: centerY + metrics.verticalRadius/2 },  // 右下
    { x: centerX, y: metrics.height },                                       // 下顶点
    { x: centerX - metrics.horizontalRadius, y: centerY + metrics.verticalRadius/2 },  // 左下
    { x: centerX - metrics.horizontalRadius, y: centerY - metrics.verticalRadius/2 },  // 左上
  ];
};

/**
 * 将顶点坐标转换为SVG路径
 * @param points 六边形顶点坐标数组
 */
export const pointsToPath = (points: HexPoint[]): string => {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x},${point.y}`)
    .join(' ') + ' Z';
};

/**
 * 检查点是否在六边形内部
 * @param point 待检查的点
 * @param hexPoints 六边形的顶点
 */
export const isPointInHex = (point: HexPoint, hexPoints: HexPoint[]): boolean => {
  // 射线法判断点是否在多边形内部
  let inside = false;
  for (let i = 0, j = hexPoints.length - 1; i < hexPoints.length; j = i++) {
    const xi = hexPoints[i].x, yi = hexPoints[i].y;
    const xj = hexPoints[j].x, yj = hexPoints[j].y;
    
    const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

/**
 * 缩放点坐标
 * @param point 原始点坐标
 * @param centerX 中心点X坐标
 * @param centerY 中��点Y坐标
 * @param scaleFactor 缩放因子
 */
export const scalePoint = (
  point: HexPoint, 
  centerX: number, 
  centerY: number, 
  scaleFactor: number
): HexPoint => ({
  x: centerX + (point.x - centerX) * scaleFactor,
  y: centerY + (point.y - centerY) * scaleFactor,
});

/**
 * 创建防抖点击处理函数
 * @param callback 回调函数
 * @param delay 延迟时间（毫秒）
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export const createDebounceClick = (callback: Function, delay = 300) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), delay);
  };
}; 