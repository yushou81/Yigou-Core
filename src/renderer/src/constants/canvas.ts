import { CanvasSettings, ToolConfig } from '../types/canvas';

/**
 * 画布默认设置
 */
export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  gridSize: 20,  // 从 50 缩小到 20，提高定位精度
  snapToGrid: true,
  showGrid: true,
  gridColor: '#e0e0e0',
  backgroundColor: '#ffffff',
  minScale: 0.1,
  maxScale: 3,
  scaleFactor: 1.1,
};

/**
 * 工具配置
 */
export const TOOL_CONFIGS: ToolConfig[] = [
  {
    type: 'node',
    label: '节点',
    shortcut: 'N',
    defaultProps: {
      width: 200,
      height: 120,
      fill: '#f8f9fa',
      stroke: '#333',
      strokeWidth: 1,
      title: 'Node',
      inputProps: [''],
      outputProps: [''],
    },
  },
  {
    type: 'container',
    label: '容器',
    shortcut: 'C',
    defaultProps: {
      width: 480,
      height: 320,
      fill: '#f8fafc',
      title: 'Container',
    },
  },
  {
    type: 'arrow',
    label: '箭头',
    shortcut: 'A',
    defaultProps: {
      fill: '#666666',
      stroke: '#666666',
      strokeWidth: 2,
      points: [0, 0, 0, 0],
    },
  },
];

/**
 * 键盘快捷键映射
 */
export const KEYBOARD_SHORTCUTS = {
  NODE: 'KeyN',
  ARROW: 'KeyA',
  DELETE: 'Delete',
  DUPLICATE: 'KeyD',
  SELECT_ALL: 'KeyA',
  ESCAPE: 'Escape',
  SPACE: 'Space',
} as const;

/**
 * 画布事件类型
 */
export const CANVAS_EVENTS = {
  SHAPE_SELECT: 'shape:select',
  SHAPE_DESELECT: 'shape:deselect',
  SHAPE_ADD: 'shape:add',
  SHAPE_UPDATE: 'shape:update',
  SHAPE_DELETE: 'shape:delete',
  CAMERA_CHANGE: 'camera:change',
  TOOL_CHANGE: 'tool:change',
} as const;

/**
 * 默认形状颜色
 */
export const DEFAULT_SHAPE_COLORS = [
  '#3E92CC', // 蓝色
  '#FF5A5F', // 红色
  '#28a745', // 绿色
  '#ffc107', // 黄色
  '#6f42c1', // 紫色
  '#fd7e14', // 橙色
  '#20c997', // 青色
  '#6c757d', // 灰色
] as const;

/**
 * 画布尺寸限制
 */
export const CANVAS_LIMITS = {
  MIN_WIDTH: 100,
  MIN_HEIGHT: 100,
  MAX_WIDTH: 10000,
  MAX_HEIGHT: 10000,
  MIN_SCALE: 0.01,
  MAX_SCALE: 10,
} as const;

/**
 * 性能优化配置
 */
export const PERFORMANCE_CONFIG = {
  MAX_SHAPES_FOR_ANIMATION: 10000,
  DEBOUNCE_DELAY: 16, // 60fps
  THROTTLE_DELAY: 100,
  BATCH_UPDATE_DELAY: 50,
} as const;
