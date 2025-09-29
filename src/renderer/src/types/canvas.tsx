
// 单个图形元素的数据结构
export interface ShapeData {
  id: string;
  type: 'rectangle' | 'circle';
  x: number; // 世界坐标 X
  y: number; // 世界坐标 Y
  width: number;
  height: number;
  fill: string;
}

// 画布的视口/相机状态
export interface CameraState {
  scale: number; // 缩放比例
  x: number;     // 视口在屏幕上的 X 偏移量
  y: number;     // 视口在屏幕上的 Y 偏移量
}