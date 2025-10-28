
// 图形类型定义
export type ShapeType = 'arrow' | 'node' | 'container';

// 连接点类型
export type ConnectionPointType = 'top' | 'bottom' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

// 连接点接口
export interface ConnectionPoint {
  id: string;
  type: ConnectionPointType;
  x: number;
  y: number;
  isConnected: boolean;
}

// 单个图形元素的数据结构
export interface ShapeData {
  id: string;
  type: ShapeType;
  x: number; // 世界坐标 X
  y: number; // 世界坐标 Y
  width?: number;
  height?: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  points?: number[]; // 用于箭头等需要点坐标的形状
  rotation?: number; // 旋转角度
  opacity?: number; // 透明度
  visible?: boolean; // 是否可见
  locked?: boolean; // 是否锁定
  parentContainerId?: string | null; // 所属容器ID
  
  // Node 特有属性
  inputProps?: string[]; // 输入属性列表
  outputProps?: string[]; // 输出属性列表
  inputData?: Record<string, any>; // 自定义输入数据
  outputData?: Record<string, any>; // 自定义输出数据/运行结果
  inputDataEnabled?: boolean; // 是否启用自定义输入数据
  outputDataEnabled?: boolean; // 是否启用自定义输出数据
  connectionPoints?: ConnectionPoint[]; // 连接点
  title?: string; // 节点标题

  // Node API 配置（可选）
  apiEnabled?: boolean; // 是否启用 API 调用
  apiUseAsOutput?: boolean; // 勾选后使用 API 结果作为输出
  apiMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE'; // 调用方法
  apiUrl?: string; // 调用地址
  apiBody?: string; // 请求体（JSON 字符串）
  lastRunAt?: number; // 最近一次运行的时间戳
  
  // Arrow 特有属性
  startNodeId?: string; // 起始节点 ID
  endNodeId?: string; // 结束节点 ID
  startPointId?: string; // 起始连接点 ID
  endPointId?: string; // 结束连接点 ID
  // 端点与节点边连接的固定位置信息
  sourceAttach?: { side: 'top' | 'bottom' | 'left' | 'right'; ratio: number } | null;
  targetAttach?: { side: 'top' | 'bottom' | 'left' | 'right'; ratio: number } | null;
  // 新增：用于显示名称与隐藏存储ID
  sourceNodeId?: string; // 源节点 ID（内部使用，不展示）
  targetNodeId?: string; // 目标节点 ID（内部使用，不展示）

  // Container 特有属性
  collapsed?: boolean; // 是否折叠/收起（可选）
  hovered?: boolean; // 是否悬停
  selected?: boolean; // 是否选中

  // 新增：用于记录基于吸附/连接的源与目标
  sourceNode?: string | null; // 连接的源节点ID
  targetNode?: string | null; // 连接的目标节点ID
}

// 画布的视口/相机状态
export interface CameraState {
  scale: number; // 缩放比例
  x: number;     // 视口在屏幕上的 X 偏移量
  y: number;     // 视口在屏幕上的 Y 偏移量
}

// 画布状态
export interface CanvasState {
  shapes: ShapeData[];
  selectedShapeIds: string[];
  camera: CameraState;
  isDrawing: boolean;
  drawingShape: ShapeData | null;
  selectedTool: ShapeType | null;
}

// 画布操作历史
export interface CanvasHistory {
  past: CanvasState[];
  present: CanvasState;
  future: CanvasState[];
}

// 画布事件类型
export interface CanvasEvents {
  onShapeSelect: (shapeId: string) => void;
  onShapeDeselect: (shapeId: string) => void;
  onShapeAdd: (shape: ShapeData) => void;
  onShapeUpdate: (shapeId: string, updates: Partial<ShapeData>) => void;
  onShapeDelete: (shapeId: string) => void;
  onCameraChange: (camera: CameraState) => void;
}

// 工具配置
export interface ToolConfig {
  type: ShapeType;
  label: string;
  icon?: string;
  shortcut?: string;
  defaultProps?: Partial<ShapeData>;
}

// 画布设置
export interface CanvasSettings {
  gridSize: number;
  snapToGrid: boolean;
  showGrid: boolean;
  gridColor: string;
  backgroundColor: string;
  minScale: number;
  maxScale: number;
  scaleFactor: number;
}