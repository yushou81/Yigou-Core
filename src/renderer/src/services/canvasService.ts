import { ShapeData, ShapeType, CameraState, CanvasState } from '../types/canvas';

/**
 * 画布服务类 - 管理画布状态和操作
 */
export class CanvasService {
  private state: CanvasState;
  private listeners: Set<(state: CanvasState) => void> = new Set();

  constructor(initialState?: Partial<CanvasState>) {
    this.state = {
      shapes: [],
      selectedShapeIds: [],
      camera: { scale: 1, x: 0, y: 0 },
      isDrawing: false,
      drawingShape: null,
      selectedTool: null,
      ...initialState,
    };
  }

  /**
   * 订阅状态变化
   */
  subscribe(listener: (state: CanvasState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 获取当前状态
   */
  getState(): CanvasState {
    return { ...this.state };
  }

  /**
   * 更新状态并通知监听器
   */
  private updateState(updates: Partial<CanvasState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * 添加形状
   */
  addShape(shape: ShapeData): void {
    const newShapes = [...this.state.shapes, shape];
    this.updateState({ shapes: newShapes });
  }

  /**
   * 更新形状
   */
  updateShape(shapeId: string, updates: Partial<ShapeData>): void {
    const newShapes = this.state.shapes.map(shape =>
      shape.id === shapeId ? { ...shape, ...updates } : shape
    );
    this.updateState({ shapes: newShapes });
  }

  /**
   * 删除形状
   */
  deleteShape(shapeId: string): void {
    const newShapes = this.state.shapes.filter(shape => shape.id !== shapeId);
    const newSelectedIds = this.state.selectedShapeIds.filter(id => id !== shapeId);
    this.updateState({ 
      shapes: newShapes,
      selectedShapeIds: newSelectedIds
    });
  }

  /**
   * 选择形状
   */
  selectShape(shapeId: string): void {
    if (!this.state.selectedShapeIds.includes(shapeId)) {
      const newSelectedIds = [...this.state.selectedShapeIds, shapeId];
      this.updateState({ selectedShapeIds: newSelectedIds });
    }
  }

  /**
   * 取消选择形状
   */
  deselectShape(shapeId: string): void {
    const newSelectedIds = this.state.selectedShapeIds.filter(id => id !== shapeId);
    this.updateState({ selectedShapeIds: newSelectedIds });
  }

  /**
   * 清空选择
   */
  clearSelection(): void {
    this.updateState({ selectedShapeIds: [] });
  }

  /**
   * 设置相机状态
   */
  setCamera(camera: CameraState): void {
    this.updateState({ camera });
  }

  /**
   * 设置选中的工具
   */
  setSelectedTool(tool: ShapeType | null): void {
    this.updateState({ selectedTool: tool });
  }

  /**
   * 开始绘制
   */
  startDrawing(shape: ShapeData): void {
    this.updateState({ 
      isDrawing: true, 
      drawingShape: shape 
    });
  }

  /**
   * 更新绘制中的形状
   */
  updateDrawingShape(updates: Partial<ShapeData>): void {
    if (this.state.drawingShape) {
      const updatedDrawingShape = { ...this.state.drawingShape, ...updates };
      this.updateState({ drawingShape: updatedDrawingShape });
    }
  }

  /**
   * 结束绘制
   */
  endDrawing(): void {
    if (this.state.drawingShape) {
      this.addShape(this.state.drawingShape);
    }
    this.updateState({ 
      isDrawing: false, 
      drawingShape: null,
      selectedTool: null
    });
  }

  /**
   * 取消绘制
   */
  cancelDrawing(): void {
    this.updateState({ 
      isDrawing: false, 
      drawingShape: null,
      selectedTool: null
    });
  }

  /**
   * 获取指定形状
   */
  getShape(shapeId: string): ShapeData | undefined {
    return this.state.shapes.find(shape => shape.id === shapeId);
  }

  /**
   * 获取选中的形状
   */
  getSelectedShapes(): ShapeData[] {
    return this.state.shapes.filter(shape => 
      this.state.selectedShapeIds.includes(shape.id)
    );
  }

  /**
   * 清空画布
   */
  clearCanvas(): void {
    this.updateState({ 
      shapes: [],
      selectedShapeIds: [],
      isDrawing: false,
      drawingShape: null
    });
  }

  /**
   * 复制选中的形状
   */
  duplicateSelectedShapes(): void {
    const selectedShapes = this.getSelectedShapes();
    const duplicatedShapes = selectedShapes.map(shape => ({
      ...shape,
      id: `${shape.id}_copy_${Date.now()}`,
      x: shape.x + 20,
      y: shape.y + 20,
    }));
    
    const newShapes = [...this.state.shapes, ...duplicatedShapes];
    this.updateState({ shapes: newShapes });
  }

  /**
   * 删除选中的形状
   */
  deleteSelectedShapes(): void {
    const newShapes = this.state.shapes.filter(shape => 
      !this.state.selectedShapeIds.includes(shape.id)
    );
    this.updateState({ 
      shapes: newShapes,
      selectedShapeIds: []
    });
  }
}

// 创建单例实例
export const canvasService = new CanvasService();
