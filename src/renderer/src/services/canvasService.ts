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

  /**
   * 导出项目数据为 JSON
   */
  exportProject(): string {
    const projectData = {
      version: '1.0.0',
      timestamp: Date.now(),
      camera: this.state.camera,
      shapes: this.state.shapes,
      // 可以添加其他需要保存的状态
    };
    return JSON.stringify(projectData, null, 2);
  }

  /**
   * 从 JSON 数据加载项目
   */
  loadProject(jsonData: string): { success: boolean; message?: string } {
    try {
      const projectData = JSON.parse(jsonData);
      
      // 验证数据格式
      if (!projectData.shapes || !Array.isArray(projectData.shapes)) {
        return { success: false, message: '无效的项目文件格式：缺少 shapes 数组' };
      }

      // 恢复相机状态（如果存在）
      if (projectData.camera) {
        this.setCamera(projectData.camera);
      }

      // 恢复形状数据
      this.updateState({
        shapes: projectData.shapes,
        selectedShapeIds: [],
        isDrawing: false,
        drawingShape: null,
      });

      return { success: true };
    } catch (error) {
      console.error('加载项目失败:', error);
      return { success: false, message: `解析项目文件失败: ${error}` };
    }
  }

  /**
   * 保存项目到文件（通过 Electron IPC）
   */
  async saveProjectToFile(): Promise<{ success: boolean; filePath?: string; message?: string }> {
    try {
      // 调试信息
      console.log('[CanvasService] saveProjectToFile called');
      console.log('[CanvasService] window exists:', typeof window !== 'undefined');
      console.log('[CanvasService] window.api exists:', typeof window !== 'undefined' && !!window.api);
      
      // 检查 window.api 是否存在以及方法是否存在
      if (typeof window === 'undefined') {
        return { success: false, message: '文件 API 不可用：window 对象未定义（可能在非浏览器环境）' };
      }
      
      if (!window.api) {
        console.error('[CanvasService] window.api 未定义，window 对象内容:', Object.keys(window));
        return { success: false, message: '文件 API 不可用：window.api 未定义。请确保在 Electron 环境中运行，并且 preload 脚本已正确加载。' };
      }
      
      if (typeof window.api.saveProject !== 'function') {
        console.error('[CanvasService] window.api.saveProject 不是函数，window.api 内容:', Object.keys(window.api));
        return { success: false, message: '文件 API 不可用：saveProject 方法不存在。window.api 对象: ' + JSON.stringify(window.api) };
      }
      
      const jsonData = this.exportProject();
      console.log('[CanvasService] Calling window.api.saveProject with data length:', jsonData.length);
      return await window.api.saveProject(jsonData);
    } catch (error) {
      console.error('[CanvasService] 保存项目失败:', error);
      return { success: false, message: `保存失败: ${error}` };
    }
  }

  /**
   * 从文件加载项目（通过 Electron IPC）
   */
  async loadProjectFromFile(): Promise<{ success: boolean; message?: string }> {
    try {
      // 调试信息
      console.log('[CanvasService] loadProjectFromFile called');
      console.log('[CanvasService] window exists:', typeof window !== 'undefined');
      console.log('[CanvasService] window.api exists:', typeof window !== 'undefined' && !!window.api);
      
      // 检查 window.api 是否存在以及方法是否存在
      if (typeof window === 'undefined') {
        return { success: false, message: '文件 API 不可用：window 对象未定义（可能在非浏览器环境）' };
      }
      
      if (!window.api) {
        console.error('[CanvasService] window.api 未定义，window 对象内容:', Object.keys(window));
        return { success: false, message: '文件 API 不可用：window.api 未定义。请确保在 Electron 环境中运行，并且 preload 脚本已正确加载。' };
      }
      
      if (typeof window.api.loadProject !== 'function') {
        console.error('[CanvasService] window.api.loadProject 不是函数，window.api 内容:', Object.keys(window.api));
        return { success: false, message: '文件 API 不可用：loadProject 方法不存在。window.api 对象: ' + JSON.stringify(window.api) };
      }
      
      console.log('[CanvasService] Calling window.api.loadProject');
      const result = await window.api.loadProject();
      
      if (!result.success || !result.data) {
        return result;
      }

      return this.loadProject(result.data);
    } catch (error) {
      console.error('[CanvasService] 加载项目失败:', error);
      return { success: false, message: `加载失败: ${error}` };
    }
  }
}

// 创建单例实例
export const canvasService = new CanvasService();
