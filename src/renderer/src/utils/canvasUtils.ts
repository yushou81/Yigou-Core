import { ShapeData, CameraState, ShapeType } from '../types/canvas';
import { DEFAULT_SHAPE_COLORS, CANVAS_LIMITS } from '../constants/canvas';

/**
 * 生成唯一 ID
 */
export const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 生成随机颜色
 */
export const generateRandomColor = (): string => {
  const colors = DEFAULT_SHAPE_COLORS;
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * 创建默认形状
 */
export const createDefaultShape = (
  type: ShapeType,
  x: number,
  y: number,
  overrides: Partial<ShapeData> = {}
): ShapeData => {
  const baseShape: ShapeData = {
    id: generateId(),
    type,
    x,
    y,
    fill: generateRandomColor(),
    visible: true,
    locked: false,
    opacity: 1,
    rotation: 0,
  };

  switch (type) {
    case 'arrow':
      return {
        ...baseShape,
        points: [x, y, x, y],
        stroke: '#000000',
        strokeWidth: 4,
        ...overrides,
      };
    case 'node':
      return {
        ...baseShape,
        width: 200,
        height: 120,
        fill: '#ffffff',
        stroke: '#d0d0d0',
        title: 'Node',
        inputProps: [''],
        outputProps: [''],
        ...overrides,
      };
    case 'container':
      return {
        ...baseShape,
        width: 480,
        height: 320,
        fill: '#f8fafc',
        title: 'Container',
        ...overrides,
      };
    default:
      return baseShape;
  }
};

/**
 * 计算两点之间的距离
 */
export const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

/**
 * 计算矩形的中心点
 */
export const getRectangleCenter = (x: number, y: number, width: number, height: number) => {
  return {
    x: x + width / 2,
    y: y + height / 2,
  };
};

/**
 * 计算圆的中心点
 */
export const getCircleCenter = (x: number, y: number, radius: number) => {
  return {
    x: x + radius,
    y: y + radius,
  };
};

/**
 * 检查点是否在矩形内
 */
export const isPointInRectangle = (
  pointX: number,
  pointY: number,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number
): boolean => {
  return (
    pointX >= rectX &&
    pointX <= rectX + rectWidth &&
    pointY >= rectY &&
    pointY <= rectY + rectHeight
  );
};

/**
 * 检查点是否在圆内
 */
export const isPointInCircle = (
  pointX: number,
  pointY: number,
  circleX: number,
  circleY: number,
  radius: number
): boolean => {
  const distance = calculateDistance(pointX, pointY, circleX, circleY);
  return distance <= radius;
};

/**
 * 检查点是否在形状内
 */
export const isPointInShape = (pointX: number, pointY: number, shape: ShapeData): boolean => {
  switch (shape.type) {
    case 'arrow':
      // 箭头点击检测比较复杂，这里简化处理
      return false;
    case 'node':
      return isPointInRectangle(
        pointX,
        pointY,
        shape.x,
        shape.y,
        shape.width || 0,
        shape.height || 0
      );
    default:
      return false;
  }
};

/**
 * 将屏幕坐标转换为世界坐标
 */
export const screenToWorld = (
  screenX: number,
  screenY: number,
  camera: CameraState
): { x: number; y: number } => {
  return {
    x: (screenX - camera.x) / camera.scale,
    y: (screenY - camera.y) / camera.scale,
  };
};

/**
 * 将世界坐标转换为屏幕坐标
 */
export const worldToScreen = (
  worldX: number,
  worldY: number,
  camera: CameraState
): { x: number; y: number } => {
  return {
    x: worldX * camera.scale + camera.x,
    y: worldY * camera.scale + camera.y,
  };
};

/**
 * 限制数值在指定范围内
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * 限制相机缩放
 */
export const clampCameraScale = (scale: number): number => {
  return clamp(scale, CANVAS_LIMITS.MIN_SCALE, CANVAS_LIMITS.MAX_SCALE);
};

/**
 * 限制形状尺寸
 */
export const clampShapeSize = (size: number): number => {
  return clamp(size, CANVAS_LIMITS.MIN_WIDTH, CANVAS_LIMITS.MAX_WIDTH);
};

/**
 * 计算形状的边界框
 */
export const getShapeBounds = (shape: ShapeData): {
  x: number;
  y: number;
  width: number;
  height: number;
} => {
  switch (shape.type) {
    case 'arrow':
      if (!shape.points || shape.points.length < 4) {
        return { x: 0, y: 0, width: 0, height: 0 };
      }
      const minX = Math.min(shape.points[0], shape.points[2]);
      const maxX = Math.max(shape.points[0], shape.points[2]);
      const minY = Math.min(shape.points[1], shape.points[3]);
      const maxY = Math.max(shape.points[1], shape.points[3]);
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    case 'node':
      return {
        x: shape.x,
        y: shape.y,
        width: shape.width || 0,
        height: shape.height || 0,
      };
    default:
      return { x: 0, y: 0, width: 0, height: 0 };
  }
};

/**
 * 计算多个形状的联合边界框
 */
export const getShapesBounds = (shapes: ShapeData[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} => {
  if (shapes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  shapes.forEach(shape => {
    const bounds = getShapeBounds(shape);
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

/**
 * 防抖函数
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * 节流函数
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

/**
 * 计算吸附点
 */
export const calculateSnapPoint = (x: number, y: number, gridSize: number, snapThreshold: number = 10): { x: number; y: number; snapped: boolean } => {
  const snappedX = Math.round(x / gridSize) * gridSize;
  const snappedY = Math.round(y / gridSize) * gridSize;
  
  const distanceX = Math.abs(x - snappedX);
  const distanceY = Math.abs(y - snappedY);
  
  const snapped = distanceX <= snapThreshold && distanceY <= snapThreshold;
  
  return {
    x: snapped ? snappedX : x,
    y: snapped ? snappedY : y,
    snapped,
  };
};

/**
 * 查找最近的吸附点
 */
export const findNearestSnapPoint = (
  x: number,
  y: number,
  snapPoints: Array<{ x: number; y: number }>,
  snapThreshold: number = 10
): { x: number; y: number } | null => {
  let nearestPoint: { x: number; y: number } | null = null;
  let minDistance = snapThreshold;
  
  for (const point of snapPoints) {
    const distance = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
    if (distance < minDistance) {
      minDistance = distance;
      nearestPoint = point;
    }
  }
  
  return nearestPoint;
};

/**
 * 从形状列表中提取所有吸附点
 */
export const extractSnapPoints = (shapes: ShapeData[]): Array<{ x: number; y: number }> => {
  const snapPoints: Array<{ x: number; y: number }> = [];
  
  for (const shape of shapes) {
    if (shape.type === 'node' && shape.connectionPoints) {
      // 从 Node 中提取所有连接点作为吸附点
      for (const point of shape.connectionPoints) {
        snapPoints.push({ x: shape.x + point.x, y: shape.y + point.y });
      }
    }
  }
  
  return snapPoints;
};

/**
 * 查找坐标点离哪个形状的边框最近 (边框吸附)
 */
export function findNearestPointOnShapeEdge(
  x: number,
  y: number,
  shapes: ShapeData[],
  snapTolerance: number
): { x: number; y: number; shapeId: string; type: string } | null {
  let minDistance = Infinity;
  let snapResult: { x: number; y: number; shapeId: string; type: string } | null = null;

  for (const shape of shapes) {
    // 只允许对实体组件做边框吸附：必须是节点，且有尺寸并可见
    if (shape.type !== 'node' || !shape.width || !shape.height || shape.visible === false) continue;
    const { x: sx, y: sy, width: sw, height: sh } = shape;

    const top = { x: Math.max(sx, Math.min(x, sx + sw)), y: sy };
    const bottom = { x: Math.max(sx, Math.min(x, sx + sw)), y: sy + sh };
    const left = { x: sx, y: Math.max(sy, Math.min(y, sy + sh)) };
    const right = { x: sx + sw, y: Math.max(sy, Math.min(y, sy + sh)) };

    const edges = [
      { p: top, type: 'top' },
      { p: bottom, type: 'bottom' },
      { p: left, type: 'left' },
      { p: right, type: 'right' },
    ];

    for (const edge of edges) {
      // 如果该投影点恰与节点的连接点非常接近，则跳过（避免“定位点/锚点”误吸附）
      if (shape.connectionPoints && shape.connectionPoints.length > 0) {
        const nearAnchor = shape.connectionPoints.some(cp => {
          const ax = sx + cp.x;
          const ay = sy + cp.y;
          return Math.hypot(edge.p.x - ax, edge.p.y - ay) < 2; // 2px 内视为锚点，忽略
        });
        if (nearAnchor) continue;
      }

      const dist = Math.hypot(edge.p.x - x, edge.p.y - y);
      if (dist < minDistance && dist < snapTolerance) {
        minDistance = dist;
        snapResult = { x: edge.p.x, y: edge.p.y, shapeId: shape.id, type: edge.type };
      }
    }
  }

  return snapResult;
}

/**
 * 计算正交路由 (L-Shape)
 */
export function getOrthogonalPoints(
  start: { x: number; y: number; type: string | null },
  end: { x: number; y: number; type: string | null }
): number[] {
  const { x: x1, y: y1 } = start;
  const { x: x2, y: y2 } = end;

  const midX = x2;
  const midY = y1;

  return [x1, y1, midX, midY, x2, y2];
}
