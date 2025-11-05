// ================================
// useCanvas：画布状态的订阅与操作封装
// 
// - 对外暴露 shapes/camera 等状态（来自 CanvasService 单例）
// - 暴露 addShape/updateShape/selectShape 等操作方法，内部直接调用 service
// - 组件通过此 Hook 订阅 service 的变更，保持 UI 与状态同步
// ================================
import { useState, useEffect, useCallback } from 'react';
import { CanvasState, ShapeData, ShapeType, CameraState } from '../types/canvas';
import { canvasService } from '../services/canvasService';

/**
 * 画布状态管理 Hook
 */
export const useCanvas = () => {
  const [state, setState] = useState<CanvasState>(canvasService.getState());

  useEffect(() => {
    const unsubscribe = canvasService.subscribe(setState);
    return unsubscribe;
  }, []);

  const addShape = useCallback((shape: ShapeData) => {
    canvasService.addShape(shape);
  }, []);

  const updateShape = useCallback((shapeId: string, updates: Partial<ShapeData>) => {
    canvasService.updateShape(shapeId, updates);
  }, []);

  const deleteShape = useCallback((shapeId: string) => {
    canvasService.deleteShape(shapeId);
  }, []);

  const selectShape = useCallback((shapeId: string) => {
    canvasService.selectShape(shapeId);
  }, []);

  const deselectShape = useCallback((shapeId: string) => {
    canvasService.deselectShape(shapeId);
  }, []);

  const clearSelection = useCallback(() => {
    canvasService.clearSelection();
  }, []);

  const setCamera = useCallback((camera: CameraState) => {
    canvasService.setCamera(camera);
  }, []);

  const setSelectedTool = useCallback((tool: ShapeType | null) => {
    canvasService.setSelectedTool(tool);
  }, []);

  const startDrawing = useCallback((shape: ShapeData) => {
    canvasService.startDrawing(shape);
  }, []);

  const updateDrawingShape = useCallback((updates: Partial<ShapeData>) => {
    canvasService.updateDrawingShape(updates);
  }, []);

  const endDrawing = useCallback(() => {
    canvasService.endDrawing();
  }, []);

  const cancelDrawing = useCallback(() => {
    canvasService.cancelDrawing();
  }, []);

  const getShape = useCallback((shapeId: string) => {
    return canvasService.getShape(shapeId);
  }, []);

  const getSelectedShapes = useCallback(() => {
    return canvasService.getSelectedShapes();
  }, []);

  const clearCanvas = useCallback(() => {
    canvasService.clearCanvas();
  }, []);

  const duplicateSelectedShapes = useCallback(() => {
    canvasService.duplicateSelectedShapes();
  }, []);

  const deleteSelectedShapes = useCallback(() => {
    canvasService.deleteSelectedShapes();
  }, []);

  return {
    // 状态
    ...state,
    
    // 操作方法
    addShape,
    updateShape,
    deleteShape,
    selectShape,
    deselectShape,
    clearSelection,
    setCamera,
    setSelectedTool,
    startDrawing,
    updateDrawingShape,
    endDrawing,
    cancelDrawing,
    getShape,
    getSelectedShapes,
    clearCanvas,
    duplicateSelectedShapes,
    deleteSelectedShapes,
  };
};
