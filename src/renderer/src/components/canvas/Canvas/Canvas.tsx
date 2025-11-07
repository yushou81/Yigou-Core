// ================================
// Canvas 画布主组件
// 
// 本文件负责：
// 1) 创建 Konva Stage/Layer 作为“世界坐标系”的渲染容器
// 2) 维护“相机(camera)”状态：x/y 为平移偏移，scale 为缩放比例
// 3) 绑定事件：
//    - 鼠标中键/空格按住 + 拖动平移画布
//    - 滚轮缩放（围绕鼠标指针放大/缩小）
//    - 支持从左侧工具栏拖拽组件到画布，按世界坐标落点
// 4) 负责把 shapes 按类型渲染为各自的 React Konva 图形（Container/Node/Start/Arrow）
// 5) 顶部 AppBar 提供：保存/加载/运行、上一/下一箭头聚焦等
// 
// 坐标系说明：
// - 我们把 Layer 的 x/y/scaleX/scaleY 作为“相机变换”，始终让 shapes 的 points/x/y 等存储为“世界坐标”。
// - 居中定位到世界坐标 (cx,cy) 的公式：camera.x = stageWidth/2 - cx*scale，camera.y = stageHeight/2 - cy*scale。
// - 拖拽端点时需要把屏幕指针坐标通过 Layer 的逆变换反投影回世界坐标（见 Arrow.tsx）。
// ================================
import React, { useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stage, Layer, Group, Circle, Rect, Line } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { useCanvas } from '../../../hooks/useCanvas';
import { Toolbar } from '../Toolbar';
import { CanvasAppBar } from '../AppBar';
import { Arrow } from '../shapes/Arrow';
import { Container } from '../components/Container';
import { Node } from '../shapes/Node';
import { Start } from '../shapes/Start';
import { GridBackground } from './GridBackground';
import { PropertyPanel } from '../PropertyPanel';
import { screenToWorld, clampCameraScale, findNearestPointOnShapeEdge } from '../../../utils/canvasUtils';
import { DEFAULT_CANVAS_SETTINGS } from '../../../constants/canvas';
import { createDefaultShape } from '../../../utils/canvasUtils';
import { ShapeType } from '../../../types/canvas';
import { canvasService } from '../../../services/canvasService';
import styles from './Canvas.module.css';

/**
 * 主画布组件
 */
export const Canvas: React.FC = () => {
  const navigate = useNavigate();
  const stageRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const panRafRef = useRef<number>(0 as any);
  const panDeltaRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [stageSize, setStageSize] = React.useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [toast, setToast] = React.useState<string | null>(null);
  const [selectedShapeForProperties, setSelectedShapeForProperties] = React.useState<any>(null);
  const [dragPreview, setDragPreview] = React.useState<{shapeType: string, x: number, y: number} | null>(null);
  const [isPanning, setIsPanning] = React.useState(false);
  const panRef = React.useRef<{ isSpacePressed: boolean; lastX: number; lastY: number }>({
    isSpacePressed: false,
    lastX: 0,
    lastY: 0,
  });

  const {
    shapes,
    selectedShapeIds,
    camera,
    isDrawing,
    drawingShape,
    setCamera,
    startDrawing,
    updateDrawingShape,
    endDrawing,
    cancelDrawing,
    selectShape,
    clearSelection,
    addShape,
    updateShape,
    deleteShape,
  } = useCanvas();

  // 根据容器的新边界，动态判定并更新所有节点的归属（是否被该容器包裹）
  const updateNodesParentByContainerBounds = useCallback((containerId: string, bx: number, by: number, bw: number, bh: number) => {
    const nodes = shapes.filter(s => (s.type === 'node' || s.type === 'start'));
    nodes.forEach(node => {
      const nx = node.x || 0;
      const ny = node.y || 0;
      const nw = node.width || 0;
      const nh = node.height || 0;
      const cx = nx + nw / 2;
      const cy = ny + nh / 2;
      const inside = cx >= bx && cx <= bx + bw && cy >= by && cy <= by + bh;
      const currentParent = (node as any).parentContainerId || null;
      if (inside && currentParent !== containerId) {
        updateShape(node.id, { parentContainerId: containerId });
      } else if (!inside && currentParent === containerId) {
        updateShape(node.id, { parentContainerId: null as any });
      }
    });
  }, [shapes, updateShape]);

  // 窗口大小变化处理
  useEffect(() => {
    const handleResize = () => {
      setStageSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 如果所选属性的形状被删除或未选中，则关闭属性面板
  useEffect(() => {
    if (!selectedShapeForProperties) return;
    const stillExists = shapes.some(s => s.id === selectedShapeForProperties.id);
    const anySelected = selectedShapeIds.length > 0;
    if (!stillExists || !anySelected) {
      setSelectedShapeForProperties(null);
    }
  }, [shapes, selectedShapeIds, selectedShapeForProperties]);

  // 同步属性面板中的 shape 引用为最新的 shapes 中对象，确保编辑时受控输入不会被旧引用覆盖
  useEffect(() => {
    if (!selectedShapeForProperties) return;
    const latest = shapes.find(s => s.id === selectedShapeForProperties.id);
    if (latest && latest !== selectedShapeForProperties) {
      setSelectedShapeForProperties(latest);
    }
  }, [shapes, selectedShapeForProperties]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 输入框内输入时不处理全局快捷键
      const ae = document.activeElement as HTMLElement | null;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) {
        // 允许 Ctrl/Cmd+S 保存，其他快捷键忽略
        const isMac = navigator.platform.toUpperCase().includes('MAC');
        const isSave = (isMac && e.metaKey && e.code === 'KeyS') || (!isMac && e.ctrlKey && e.code === 'KeyS');
        if (!isSave) return;
      }
      switch (e.code) {
        case 'Escape':
          if (isDrawing) {
            cancelDrawing();
          } else {
            clearSelection();
          }
          break;
        case 'Space':
          e.preventDefault();
          panRef.current.isSpacePressed = true;
          break;
        case 'Delete':
        case 'Backspace': {
          if (selectedShapeIds.length > 0) {
            e.preventDefault();
            // 批量删除选中图形
            const ids = [...selectedShapeIds];
            ids.forEach(id => deleteShape(id));
            setSelectedShapeForProperties(null);
          }
          break;
        }
        case 'KeyS': {
          const isMac = navigator.platform.toUpperCase().includes('MAC');
          const isSave = (isMac && e.metaKey) || (!isMac && e.ctrlKey);
          if (isSave) {
            e.preventDefault();
            (async () => {
              const res = await canvasService.saveProjectToFile();
              if (res.success) {
                setToast('已保存');
                setTimeout(() => setToast(null), 1500);
              } else {
                setToast(res.message || '保存失败');
                setTimeout(() => setToast(null), 2000);
              }
            })();
          }
          break;
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        panRef.current.isSpacePressed = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isDrawing, cancelDrawing, clearSelection, selectedShapeIds, deleteShape]);

  // 获取指针在世界坐标系中的位置
  const getPointerWorldPos = useCallback((stage: any) => {
    const pointer = stage.getPointerPosition();
    if (!pointer) return { x: 0, y: 0 };
    return screenToWorld(pointer.x, pointer.y, camera);
  }, [camera]);

  // 处理拖拽开始
  const handleDragStart = useCallback((shapeType: ShapeType, event: React.DragEvent) => {
    event.dataTransfer.setData('application/shape-type', shapeType);
    event.dataTransfer.effectAllowed = 'copy';
    
    // 设置拖拽预览图像 - 使用工具栏图标
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // 设置背景
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(0, 0, 48, 48);
      
      // 设置边框
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, 46, 46);
      
      // 绘制图标
      ctx.fillStyle = '#3b82f6';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      
      if (shapeType === 'node' || shapeType === 'start') {
        // 绘制节点图标
        ctx.fillRect(8, 8, 32, 20);
        ctx.fillStyle = 'white';
        ctx.fillRect(12, 12, 4, 4);
        ctx.fillRect(32, 12, 4, 4);
        ctx.fillRect(12, 20, 4, 4);
        ctx.fillRect(32, 20, 4, 4);
      } else if (shapeType === 'arrow') {
        // 绘制箭头图标
        ctx.beginPath();
        ctx.moveTo(8, 24);
        ctx.lineTo(40, 24);
        ctx.moveTo(32, 16);
        ctx.lineTo(40, 24);
        ctx.lineTo(32, 32);
        ctx.stroke();
      }
    }
    event.dataTransfer.setDragImage(canvas, 24, 24);
  }, []);

  // 处理拖拽进入画布
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // 不设置拖拽状态，避免画布变蓝
    // setIsDragOver(true);
  }, []);

  // 处理拖拽在画布上移动
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    
    // 更新拖拽预览位置
    const stage = stageRef.current;
    if (stage) {
      const rect = stage.container().getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const worldPos = screenToWorld(x, y, camera);
      
      const shapeType = e.dataTransfer.getData('application/shape-type');
      if (shapeType) {
        // 图标预览直接使用鼠标位置，不需要偏移
        setDragPreview({
          shapeType,
          x: worldPos.x,
          y: worldPos.y
        });
      }
    }
  }, [camera]);

  // 处理拖拽离开画布
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // 只有当拖拽真正离开画布容器时才清理预览
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragPreview(null);
    }
  }, []);

  // 处理拖拽放置
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragPreview(null);
    
    const shapeType = e.dataTransfer.getData('application/shape-type') as ShapeType;
    if (!shapeType) return;
    
    const stage = stageRef.current;
    if (!stage) return;
    
    const rect = stage.container().getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const worldPos = screenToWorld(x, y, camera);
    
    // 创建形状时调整位置，让形状中心对准鼠标位置
    const offsetX = (shapeType === 'node' || shapeType === 'start') ? -50 : -25;
    const offsetY = (shapeType === 'node' || shapeType === 'start') ? -30 : 0;
    
    const finalX = worldPos.x + offsetX;
    const finalY = worldPos.y + offsetY;
    
    // 创建临时 shape 以获取实际尺寸
    const tempShape = createDefaultShape(shapeType, finalX, finalY);
    
    // 对于 node 和 start 类型，先检查是否落在容器内
    let parentContainerId: string | null = null;
    if (shapeType === 'node' || shapeType === 'start') {
      const nodeWidth = tempShape.width || 0;
      const nodeHeight = tempShape.height || 0;
      const nodeCenterX = finalX + nodeWidth / 2;
      const nodeCenterY = finalY + nodeHeight / 2;
      const containers = shapes.filter(s => s.type === 'container' && (s.width || 0) > 0 && (s.height || 0) > 0);
      const hit = containers.find(c => {
        const inX = nodeCenterX >= (c.x || 0) && nodeCenterX <= (c.x || 0) + (c.width || 0);
        const inY = nodeCenterY >= (c.y || 0) && nodeCenterY <= (c.y || 0) + (c.height || 0);
        return inX && inY;
      });
      if (hit) {
        parentContainerId = hit.id;
      }
    }
    
    const newShape = createDefaultShape(shapeType, finalX, finalY, parentContainerId ? { parentContainerId } : {});
    
    if (shapeType === 'arrow') {
      startDrawing(newShape);
    } else {
      addShape(newShape);
    }
  }, [camera, startDrawing, addShape, shapes]);

  // 鼠标按下事件
  const handleMouseDown = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    // 中键，或按住空格并在空白处按下，开始平移画布
    if (
      e.evt instanceof MouseEvent && (
        e.evt.button === 1 || (panRef.current.isSpacePressed && e.target === stage)
      )
    ) {
      setIsPanning(true);
      const mouseEvt = e.evt as MouseEvent;
      panRef.current.lastX = mouseEvt.clientX;
      panRef.current.lastY = mouseEvt.clientY;
      // 开始命令式平移：关闭命中检测以减轻事件处理
      try { layerRef.current && layerRef.current.listening(false); } catch {}
      e.evt.preventDefault();
      return;
    }

    // 点击空白区域 - 只清除选择和关闭属性面板，不创建形状
    if (e.target === stage && !dragPreview) {
      clearSelection();
      
      // 关闭属性面板
      setSelectedShapeForProperties(null);
    }
  }, [clearSelection, dragPreview]);

  // 鼠标移动事件
  const handleMouseMove = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    // 平移画布
    if (isPanning && e.evt instanceof MouseEvent) {
      const mouseEvt = e.evt as MouseEvent;
      const dx = mouseEvt.clientX - panRef.current.lastX;
      const dy = mouseEvt.clientY - panRef.current.lastY;
      panRef.current.lastX = mouseEvt.clientX;
      panRef.current.lastY = mouseEvt.clientY;
      // 命令式更新 Layer 位置，合批到 RAF
      panDeltaRef.current.dx += dx;
      panDeltaRef.current.dy += dy;
      if (!panRafRef.current) {
        panRafRef.current = requestAnimationFrame(() => {
          panRafRef.current = 0 as any;
          const layer = layerRef.current;
          if (layer) {
            try {
              layer.position({ x: (camera.x || 0) + panDeltaRef.current.dx, y: (camera.y || 0) + panDeltaRef.current.dy });
              layer.getStage()?.batchDraw();
            } catch {}
          }
        });
      }
      e.evt.preventDefault();
      return;
    }

    if (isDrawing && drawingShape) {
      const stage = e.target.getStage();
      if (!stage) return;
      
      const pos = getPointerWorldPos(stage);
      const currentPoints = drawingShape.points!;
      
      // 仅移动，不做画布定位点/连接点匹配
      const endX = pos.x;
      const endY = pos.y;
      
      updateDrawingShape({
        points: [currentPoints[0], currentPoints[1], endX, endY],
      });
    }
  }, [isPanning, camera, isDrawing, drawingShape, getPointerWorldPos, updateDrawingShape, shapes]);

  // 鼠标抬起事件
  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      // 结束命令式平移：同步 React camera，并恢复设置
      const layer = layerRef.current;
      const ndx = panDeltaRef.current.dx;
      const ndy = panDeltaRef.current.dy;
      if (layer) {
        try { layer.listening(true); } catch {}
      }
      if (ndx !== 0 || ndy !== 0) {
        setCamera({ scale: camera.scale, x: (camera.x || 0) + ndx, y: (camera.y || 0) + ndy });
      }
      // 重置增量，下一次从 0 开始
      panDeltaRef.current.dx = 0;
      panDeltaRef.current.dy = 0;
    }
    if (isDrawing) {
      endDrawing();
    }
  }, [isPanning, isDrawing, endDrawing, camera, setCamera]);

  // 滚轮缩放事件
  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    // 说明：以鼠标所在位置为中心进行缩放，计算思路：
    // 1) 取当前鼠标屏幕坐标 pointer
    // 2) 把 pointer 对应到世界坐标 mousePointTo = screenToWorld(pointer)
    // 3) 计算新的 scale 后，让该世界点在屏幕中的位置保持不变，得到新的 camera.x/y
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const direction = e.evt.deltaY > 0 ? 1 : -1;
    const newScaleRaw = direction > 0 
      ? camera.scale / DEFAULT_CANVAS_SETTINGS.scaleFactor 
      : camera.scale * DEFAULT_CANVAS_SETTINGS.scaleFactor;
    
    const newScale = clampCameraScale(newScaleRaw);
    
    const mousePointTo = screenToWorld(pointer.x, pointer.y, camera);
    const newX = pointer.x - mousePointTo.x * newScale;
    const newY = pointer.y - mousePointTo.y * newScale;
    
    setCamera({ scale: newScale, x: newX, y: newY });
  }, [camera, setCamera]);

  // 形状拖拽结束事件（不进行网格或锚点吸附）
  const handleShapeDragEnd = useCallback((e: KonvaEventObject<DragEvent>, id: string) => {
    const target = e.target;
    const finalX = target.x();
    const finalY = target.y();

    const shape = shapes.find(s => s.id === id);
    if (!shape) return;

    // 箭头的点坐标由 onUpdatePoints 维护；节点直接落在拖拽结束位置
    if (shape.type !== 'arrow') {
      // 1) 更新节点位置
      updateShape(id, { x: finalX, y: finalY });

      // 2) 让所有与该节点相连的箭头端点跟随（保持吸附在边框上，优先使用 attach 信息）
      const movedNode = { ...shape, x: finalX, y: finalY } as any;
      const connectedArrows = shapes.filter(s => s.type === 'arrow' && (
        (s as any).sourceNodeId === id || (s as any).targetNodeId === id ||
        (s as any).startNodeId === id || (s as any).endNodeId === id
      ));
      connectedArrows.forEach(arrow => {
        const pts = arrow.points || [0, 0, 0, 0];
        let [x1, y1, x2, y2] = pts;
        const w = movedNode.width || 0;
        const h = movedNode.height || 0;
        
        // 更新起点：如果连接到节点，优先使用 attach 信息固定到连接点
        if ((arrow as any).sourceNodeId === id || (arrow as any).startNodeId === id) {
          if ((arrow as any).sourceAttach) {
            // 有 attach 信息，直接使用固定到连接点
            const a = (arrow as any).sourceAttach;
            if (a.side === 'top') { x1 = movedNode.x + a.ratio * w; y1 = movedNode.y; }
            if (a.side === 'bottom') { x1 = movedNode.x + a.ratio * w; y1 = movedNode.y + h; }
            if (a.side === 'left') { x1 = movedNode.x; y1 = movedNode.y + a.ratio * h; }
            if (a.side === 'right') { x1 = movedNode.x + w; y1 = movedNode.y + a.ratio * h; }
          } else {
            // 没有 attach 信息，计算并更新 attach 信息
          const snap = findNearestPointOnShapeEdge(x1, y1, [movedNode], 1000000);
            if (snap) {
              x1 = snap.x;
              y1 = snap.y;
              // 计算并更新 attach 信息
              const side = snap.type === 'top' ? 'top' : snap.type === 'bottom' ? 'bottom' : snap.type === 'left' ? 'left' : 'right';
              const ratio = (side === 'top' || side === 'bottom')
                ? (snap.x - movedNode.x) / w
                : (snap.y - movedNode.y) / h;
              updateShape(arrow.id, { 
                sourceAttach: { side, ratio },
                points: [x1, y1, x2, y2]
              });
              return; // 已经在上面更新了
            }
          }
        }
        
        // 更新终点：如果连接到节点，优先使用 attach 信息固定到连接点
        if ((arrow as any).targetNodeId === id || (arrow as any).endNodeId === id) {
          if ((arrow as any).targetAttach) {
            // 有 attach 信息，直接使用固定到连接点
            const a = (arrow as any).targetAttach;
            if (a.side === 'top') { x2 = movedNode.x + a.ratio * w; y2 = movedNode.y; }
            if (a.side === 'bottom') { x2 = movedNode.x + a.ratio * w; y2 = movedNode.y + h; }
            if (a.side === 'left') { x2 = movedNode.x; y2 = movedNode.y + a.ratio * h; }
            if (a.side === 'right') { x2 = movedNode.x + w; y2 = movedNode.y + a.ratio * h; }
          } else {
            // 没有 attach 信息，计算并更新 attach 信息
          const snap = findNearestPointOnShapeEdge(x2, y2, [movedNode], 1000000);
            if (snap) {
              x2 = snap.x;
              y2 = snap.y;
              // 计算并更新 attach 信息
              const side = snap.type === 'top' ? 'top' : snap.type === 'bottom' ? 'bottom' : snap.type === 'left' ? 'left' : 'right';
              const ratio = (side === 'top' || side === 'bottom')
                ? (snap.x - movedNode.x) / w
                : (snap.y - movedNode.y) / h;
              updateShape(arrow.id, { 
                targetAttach: { side, ratio },
                points: [x1, y1, x2, y2]
              });
              return; // 已经在上面更新了
            }
          }
        }
        
        updateShape(arrow.id, { points: [x1, y1, x2, y2] });
      });

      // 3) 移动后的节点尝试“吸附”附近的游离箭头端点
      const SNAP_THRESHOLD_ATTACH = 15;
      const freeArrows = shapes.filter(s => s.type === 'arrow') as any[];
      freeArrows.forEach(arrow => {
        const pts = arrow.points || [0, 0, 0, 0];
        const [x1, y1, x2, y2] = pts;
        // 起点未连接，尝试吸附
        if (!arrow.sourceNodeId && !arrow.startNodeId) {
          const snap = findNearestPointOnShapeEdge(x1, y1, [movedNode], SNAP_THRESHOLD_ATTACH);
          if (snap) {
            const side = snap.type === 'top' ? 'top' : snap.type === 'bottom' ? 'bottom' : snap.type === 'left' ? 'left' : 'right';
            const ratio = (side === 'top' || side === 'bottom')
              ? (snap.x - movedNode.x) / (movedNode.width || 1)
              : (snap.y - movedNode.y) / (movedNode.height || 1);
            updateShape(arrow.id, {
              points: [snap.x, snap.y, x2, y2],
              sourceNode: movedNode.title || 'Node',
              startNodeId: id,
              sourceNodeId: id,
              sourceAttach: { side, ratio },
            });
          }
        }
        // 终点未连接，尝试吸附
        if (!arrow.targetNodeId && !arrow.endNodeId) {
          const snap = findNearestPointOnShapeEdge(x2, y2, [movedNode], SNAP_THRESHOLD_ATTACH);
          if (snap) {
            const side = snap.type === 'top' ? 'top' : snap.type === 'bottom' ? 'bottom' : snap.type === 'left' ? 'left' : 'right';
            const ratio = (side === 'top' || side === 'bottom')
              ? (snap.x - movedNode.x) / (movedNode.width || 1)
              : (snap.y - movedNode.y) / (movedNode.height || 1);
            updateShape(arrow.id, {
              points: [x1, y1, snap.x, snap.y],
              targetNode: movedNode.title || 'Node',
              endNodeId: id,
              targetNodeId: id,
              targetAttach: { side, ratio },
            });
          }
        }
      });
    }
  }, [updateShape, shapes]);

  // 选择形状时显示属性面板
  const handleShapeSelect = useCallback((shapeId: string) => {
    // 单选：先清空上一次选择，避免之前的节点仍显示选中态
    clearSelection();
    selectShape(shapeId);
    const shape = shapes.find(s => s.id === shapeId);
    // 如果选中的是箭头，设置 focused 高亮；清理上一个
    if (shape && shape.type === 'arrow') {
      if ((window as any).__lastFocusedArrowId && (window as any).__lastFocusedArrowId !== shape.id) {
        updateShape((window as any).__lastFocusedArrowId, { focused: false } as any);
      }
      updateShape(shape.id, { focused: true } as any);
      (window as any).__lastFocusedArrowId = shape.id;
    }
    setSelectedShapeForProperties(shape || null);
  }, [clearSelection, selectShape, shapes]);

  // 处理箭头点坐标更新：端点靠近 Node 边框时吸附，并记录源/目标节点
  const computeArrowPointsUpdate = useCallback((id: string, newRawPoints: number[]) => {
    const [rawX1, rawY1, rawX2, rawY2] = newRawPoints;
    const nodes = shapes.filter(s => (s.type === 'node' || s.type === 'start') && (s.width || 0) > 0 && (s.height || 0) > 0 && s.visible !== false);

    const SNAP_THRESHOLD_EDGE = 15;
    const startSnap: any = findNearestPointOnShapeEdge(rawX1, rawY1, nodes as any, SNAP_THRESHOLD_EDGE);
    const endSnap: any = findNearestPointOnShapeEdge(rawX2, rawY2, nodes as any, SNAP_THRESHOLD_EDGE);

    const sx = startSnap ? startSnap.x : rawX1;
    const sy = startSnap ? startSnap.y : rawY1;
    const ex = endSnap ? endSnap.x : rawX2;
    const ey = endSnap ? endSnap.y : rawY2;

    const toAttach = (snap: any, node: any | undefined) => {
      if (!snap || !node) return null;
      const side = snap.type === 'top' ? 'top' : snap.type === 'bottom' ? 'bottom' : snap.type === 'left' ? 'left' : 'right';
      const ratio = (side === 'top' || side === 'bottom')
        ? (snap.x - node.x) / (node.width || 1)
        : (snap.y - node.y) / (node.height || 1);
      return { side, ratio } as { side: 'top' | 'bottom' | 'left' | 'right'; ratio: number };
    };

    const startNode = startSnap ? nodes.find(n => n.id === startSnap.shapeId) : undefined;
    const endNode = endSnap ? nodes.find(n => n.id === endSnap.shapeId) : undefined;

    // 以节点名称作为用户可见的源/目标，ID 存到 *_NodeId 字段
    const sourceNodeName = startNode ? (startNode.title || 'Node') : null;
    const targetNodeName = endNode ? (endNode.title || 'Node') : null;

    updateShape(id, {
      points: [sx, sy, ex, ey],
      sourceNode: startSnap ? sourceNodeName : null,
      targetNode: endSnap ? targetNodeName : null,
      startNodeId: startSnap ? startSnap.shapeId : undefined,
      endNodeId: endSnap ? endSnap.shapeId : undefined,
      sourceNodeId: startSnap ? startSnap.shapeId : undefined,
      targetNodeId: endSnap ? endSnap.shapeId : undefined,
      sourceAttach: toAttach(startSnap, startNode),
      targetAttach: toAttach(endSnap, endNode),
    });
  }, [updateShape, shapes]);

  // 实时更新箭头，不做防抖
  const handleArrowPointsUpdate = computeArrowPointsUpdate;

  // 保存项目
  const handleSaveProject = useCallback(async () => {
    const result = await canvasService.saveProjectToFile();
    if (result.success) {
      alert(`项目已保存到: ${result.filePath}`);
    } else {
      alert(`保存失败: ${result.message || '未知错误'}`);
    }
  }, []);

  // 加载项目
  const handleLoadProject = useCallback(async () => {
    // 确认是否要覆盖当前内容
    if (shapes.length > 0) {
      const confirm = window.confirm('加载项目将覆盖当前画布内容，是否继续？');
      if (!confirm) return;
    }
    
    const result = await canvasService.loadProjectFromFile();
    if (result.success) {
      alert('项目加载成功！');
      // 清空当前选择
      clearSelection();
      setSelectedShapeForProperties(null);
    } else {
      alert(`加载失败: ${result.message || '未知错误'}`);
    }
  }, [shapes.length, clearSelection]);

  // 渲染形状组件
  const renderShape = useCallback((shape: any) => {
    const isSelected = selectedShapeIds.includes(shape.id);
    const isDragging = false; // 可以根据需要实现拖拽状态

    // 取消缩小时隐藏容器内部元素与箭头的策略，避免看起来像被容器“覆盖”或箭头丢失

    switch (shape.type) {
      case 'container':
        return (
          <Container
            key={shape.id}
            data={shape}
            isSelected={isSelected}
            onSelect={handleShapeSelect}
            onDragMove={(e, containerId) => {
              const target = e.target; const nx = target.x(); const ny = target.y();
              const container = shapes.find(s => s.id === containerId);
              if (!container) { updateShape(containerId, { x: nx, y: ny }); return; }
              // 使用容器的最新位置计算差值，避免累积误差
              const containerLatest = shapes.find(s => s.id === containerId);
              const oldContainerX = (containerLatest?.x ?? container.x) || 0;
              const oldContainerY = (containerLatest?.y ?? container.y) || 0;
              const dx = nx - oldContainerX;
              const dy = ny - oldContainerY;
              
              // 1) 移动容器
              updateShape(containerId, { x: nx, y: ny });
              // 1.1) 拖动中不修改归属，防止抖动；仅在拖动结束时判定归属
              // 2) 让容器内（或旧边界内）的节点跟随移动，并实时更新其连接的箭头位置
              // 使用旧的容器边界来判定哪些节点需要跟随（包括尚未归属但位于旧边界内的节点）
              const oldCx = (container.x || 0), oldCy = (container.y || 0);
              const cw = (container.width || 0), ch = (container.height || 0);
              const childNodes = shapes.filter(s => {
                if (!(s.type === 'node' || s.type === 'start')) return false;
                const alreadyChild = (s as any).parentContainerId === containerId;
                const centerX = (s.x || 0) + (s.width || 0) / 2;
                const centerY = (s.y || 0) + (s.height || 0) / 2;
                const insideOldBounds = centerX >= oldCx && centerX <= oldCx + cw && centerY >= oldCy && centerY <= oldCy + ch;
                return alreadyChild || insideOldBounds;
              });
              
              // 先计算所有节点的新位置（使用最新的节点位置，避免累积误差）
              const movedNodes = new Map<string, any>();
              childNodes.forEach(node => {
                // 从 shapes 中获取最新的节点位置
                const latestNode = shapes.find(s => s.id === node.id) || node;
                const nodeX = (latestNode.x || 0);
                const nodeY = (latestNode.y || 0);
                const newX = nodeX + dx;
                const newY = nodeY + dy;
                updateShape(node.id, { x: newX, y: newY });
                movedNodes.set(node.id, { ...latestNode, x: newX, y: newY } as any);
              });
              
              // 收集所有连接到容器内节点的箭头，避免重复更新
              const arrowsToUpdate = new Map<string, any>();
              childNodes.forEach(node => {
                const connectedArrows = shapes.filter(s => s.type === 'arrow' && (
                  (s as any).sourceNodeId === node.id || (s as any).targetNodeId === node.id ||
                  (s as any).startNodeId === node.id || (s as any).endNodeId === node.id
                ));
                connectedArrows.forEach(arrow => {
                  if (!arrowsToUpdate.has(arrow.id)) {
                    arrowsToUpdate.set(arrow.id, arrow);
                  }
                });
              });
              
              // 容器旧边界（用于检查自由端点是否在容器内）
              
              // 统一更新所有箭头的位置
              arrowsToUpdate.forEach(arrow => {
                const pts = arrow.points || [0, 0, 0, 0];
                let [x1, y1, x2, y2] = pts;
                const startNodeId = (arrow as any).sourceNodeId || (arrow as any).startNodeId;
                const endNodeId = (arrow as any).targetNodeId || (arrow as any).endNodeId;
                let needsUpdate = false;
                const updateData: any = {};
                
                // 更新起点：如果连接到节点，优先使用 attach 信息固定到连接点
                if (startNodeId && movedNodes.has(startNodeId)) {
                  const movedNode = movedNodes.get(startNodeId);
                  const w = movedNode.width || 0;
                  const h = movedNode.height || 0;
                  if ((arrow as any).sourceAttach) {
                    // 有 attach 信息，直接使用固定到连接点
                    const a = (arrow as any).sourceAttach;
                    if (a.side === 'top') { x1 = movedNode.x + a.ratio * w; y1 = movedNode.y; }
                    if (a.side === 'bottom') { x1 = movedNode.x + a.ratio * w; y1 = movedNode.y + h; }
                    if (a.side === 'left') { x1 = movedNode.x; y1 = movedNode.y + a.ratio * h; }
                    if (a.side === 'right') { x1 = movedNode.x + w; y1 = movedNode.y + a.ratio * h; }
                    needsUpdate = true;
                  } else {
                    // 没有 attach 信息，计算并更新 attach 信息
                    const snap = findNearestPointOnShapeEdge(x1, y1, [movedNode], 1000000);
                    if (snap) {
                      x1 = snap.x;
                      y1 = snap.y;
                      // 计算并更新 attach 信息
                      const side = snap.type === 'top' ? 'top' : snap.type === 'bottom' ? 'bottom' : snap.type === 'left' ? 'left' : 'right';
                      const ratio = (side === 'top' || side === 'bottom')
                        ? (snap.x - movedNode.x) / w
                        : (snap.y - movedNode.y) / h;
                      updateData.sourceAttach = { side, ratio };
                      needsUpdate = true;
                    }
                  }
                } else if (!startNodeId) {
                  // 起点未连接节点，检查是否是自由端点且在容器内
                  const startInside = x1 >= oldCx && x1 <= oldCx + cw && y1 >= oldCy && y1 <= oldCy + ch;
                  if (startInside) {
                    x1 = x1 + dx;
                    y1 = y1 + dy;
                    needsUpdate = true;
                  }
                }
                
                // 更新终点：如果连接到节点，优先使用 attach 信息固定到连接点
                if (endNodeId && movedNodes.has(endNodeId)) {
                  const movedNode = movedNodes.get(endNodeId);
                  const w = movedNode.width || 0;
                  const h = movedNode.height || 0;
                  if ((arrow as any).targetAttach) {
                    // 有 attach 信息，直接使用固定到连接点
                    const a = (arrow as any).targetAttach;
                    if (a.side === 'top') { x2 = movedNode.x + a.ratio * w; y2 = movedNode.y; }
                    if (a.side === 'bottom') { x2 = movedNode.x + a.ratio * w; y2 = movedNode.y + h; }
                    if (a.side === 'left') { x2 = movedNode.x; y2 = movedNode.y + a.ratio * h; }
                    if (a.side === 'right') { x2 = movedNode.x + w; y2 = movedNode.y + a.ratio * h; }
                    needsUpdate = true;
                  } else {
                    // 没有 attach 信息，计算并更新 attach 信息
                    const snap = findNearestPointOnShapeEdge(x2, y2, [movedNode], 1000000);
                    if (snap) {
                      x2 = snap.x;
                      y2 = snap.y;
                      // 计算并更新 attach 信息
                      const side = snap.type === 'top' ? 'top' : snap.type === 'bottom' ? 'bottom' : snap.type === 'left' ? 'left' : 'right';
                      const ratio = (side === 'top' || side === 'bottom')
                        ? (snap.x - movedNode.x) / w
                        : (snap.y - movedNode.y) / h;
                      updateData.targetAttach = { side, ratio };
                      needsUpdate = true;
                    }
                  }
                } else if (!endNodeId) {
                  // 终点未连接节点，检查是否是自由端点且在容器内
                  const endInside = x2 >= oldCx && x2 <= oldCx + cw && y2 >= oldCy && y2 <= oldCy + ch;
                  if (endInside) {
                    x2 = x2 + dx;
                    y2 = y2 + dy;
                    needsUpdate = true;
                  }
                }
                
                // 统一更新箭头位置和 attach 信息
                if (needsUpdate) {
                  updateData.points = [x1, y1, x2, y2];
                  updateShape(arrow.id, updateData);
                }
              });
              // 3) 同步容器内的自由箭头端点（未绑定节点的端点，或者连接到容器外节点的端点但端点本身在容器内）
              // 跳过已经在步骤2中更新过的箭头
              const allArrows = shapes.filter(s => s.type === 'arrow') as any[];
              const updatedArrowIds = new Set(arrowsToUpdate.keys());
              
              allArrows.forEach(arrow => {
                // 如果箭头已经在步骤2中更新过，跳过
                if (updatedArrowIds.has(arrow.id)) {
                  return;
                }
                
                const pts = arrow.points || [0, 0, 0, 0];
                let [x1, y1, x2, y2] = pts;
                const startNodeId = (arrow as any).sourceNodeId || (arrow as any).startNodeId;
                const endNodeId = (arrow as any).targetNodeId || (arrow as any).endNodeId;
                
                // 检查起点连接的节点是否在容器内
                const sourceNodeInContainer = startNodeId ? (() => {
                  const sourceNode = shapes.find(s => s.id === startNodeId);
                  return sourceNode && (sourceNode as any).parentContainerId === containerId;
                })() : false;
                
                // 检查终点连接的节点是否在容器内
                const targetNodeInContainer = endNodeId ? (() => {
                  const targetNode = shapes.find(s => s.id === endNodeId);
                  return targetNode && (targetNode as any).parentContainerId === containerId;
                })() : false;
                
                // 使用旧的容器位置来检查端点是否在容器内（因为箭头端点还是旧坐标）
                const startInside = x1 >= oldCx && x1 <= oldCx + cw && y1 >= oldCy && y1 <= oldCy + ch;
                const endInside = x2 >= oldCx && x2 <= oldCx + cw && y2 >= oldCy && y2 <= oldCy + ch;
                
                let moved = false;
                // 如果起点在容器内，且（未连接到节点 或 连接到容器外的节点），则移动
                if (startInside && !sourceNodeInContainer) {
                  x1 = x1 + dx;
                  y1 = y1 + dy;
                  moved = true;
                }
                
                // 如果终点在容器内，且（未连接到节点 或 连接到容器外的节点），则移动
                if (endInside && !targetNodeInContainer) {
                  x2 = x2 + dx;
                  y2 = y2 + dy;
                  moved = true;
                }
                
                if (moved) {
                  updateShape(arrow.id, { points: [x1, y1, x2, y2] });
                }
              });
            }}
            onDragEnd={(e, containerId) => {
              const target = e.target; const nx = target.x(); const ny = target.y();
              const container = shapes.find(s => s.id === containerId);
              if (!container) { updateShape(containerId, { x: nx, y: ny }); return; }
              // 使用容器的最新位置计算差值，避免累积误差
              const containerLatest = shapes.find(s => s.id === containerId);
              const oldContainerX = (containerLatest?.x ?? container.x) || 0;
              const oldContainerY = (containerLatest?.y ?? container.y) || 0;
              const dx = nx - oldContainerX;
              const dy = ny - oldContainerY;
              // 1) 更新容器位置
              updateShape(containerId, { x: nx, y: ny });
              // 1.1) 结束时再做一次归属判定，确保最终状态正确
              updateNodesParentByContainerBounds(containerId, nx, ny, container.width || 0, container.height || 0);
              // 2) 将容器内（或旧边界内）所有节点与其箭头位置最终同步
              const oldCx = (container.x || 0), oldCy = (container.y || 0);
              const cw = (container.width || 0), ch = (container.height || 0);
              const childNodes = shapes.filter(s => {
                if (!(s.type === 'node' || s.type === 'start')) return false;
                const alreadyChild = (s as any).parentContainerId === containerId;
                const centerX = (s.x || 0) + (s.width || 0) / 2;
                const centerY = (s.y || 0) + (s.height || 0) / 2;
                const insideOldBounds = centerX >= oldCx && centerX <= oldCx + cw && centerY >= oldCy && centerY <= oldCy + ch;
                return alreadyChild || insideOldBounds;
              });
              // 先计算所有节点的新位置（使用最新的节点位置，避免累积误差）
              const movedNodes = new Map<string, any>();
              childNodes.forEach(node => {
                // 从 shapes 中获取最新的节点位置
                const latestNode = shapes.find(s => s.id === node.id) || node;
                const nodeX = (latestNode.x || 0);
                const nodeY = (latestNode.y || 0);
                const newX = nodeX + dx;
                const newY = nodeY + dy;
                updateShape(node.id, { x: newX, y: newY });
                movedNodes.set(node.id, { ...latestNode, x: newX, y: newY } as any);
              });
              
              // 收集所有连接到容器内节点的箭头，避免重复更新
              const arrowsToUpdate = new Map<string, any>();
              childNodes.forEach(node => {
                const connectedArrows = shapes.filter(s => s.type === 'arrow' && (
                  (s as any).sourceNodeId === node.id || (s as any).targetNodeId === node.id ||
                  (s as any).startNodeId === node.id || (s as any).endNodeId === node.id
                ));
                connectedArrows.forEach(arrow => {
                  if (!arrowsToUpdate.has(arrow.id)) {
                    arrowsToUpdate.set(arrow.id, arrow);
                  }
                });
              });
              
              // 统一更新所有箭头的位置
              arrowsToUpdate.forEach(arrow => {
                const pts = arrow.points || [0, 0, 0, 0];
                let [x1, y1, x2, y2] = pts;
                const startNodeId = (arrow as any).sourceNodeId || (arrow as any).startNodeId;
                const endNodeId = (arrow as any).targetNodeId || (arrow as any).endNodeId;
                
                // 更新起点：如果连接到节点，优先使用 attach 信息固定到连接点
                let needsUpdate = false;
                if (startNodeId && movedNodes.has(startNodeId)) {
                  const movedNode = movedNodes.get(startNodeId);
                  if ((arrow as any).sourceAttach) {
                    // 有 attach 信息，直接使用固定到连接点
                    const a = (arrow as any).sourceAttach; const w = movedNode.width || 0; const h = movedNode.height || 0;
                    if (a.side === 'top') { x1 = movedNode.x + a.ratio * w; y1 = movedNode.y; }
                    if (a.side === 'bottom') { x1 = movedNode.x + a.ratio * w; y1 = movedNode.y + h; }
                    if (a.side === 'left') { x1 = movedNode.x; y1 = movedNode.y + a.ratio * h; }
                    if (a.side === 'right') { x1 = movedNode.x + w; y1 = movedNode.y + a.ratio * h; }
                    needsUpdate = true;
                  } else {
                    // 没有 attach 信息，计算并更新 attach 信息
                    const snap = findNearestPointOnShapeEdge(x1, y1, [movedNode], 1000000);
                    if (snap) {
                      x1 = snap.x;
                      y1 = snap.y;
                      // 计算并更新 attach 信息
                      const side = snap.type === 'top' ? 'top' : snap.type === 'bottom' ? 'bottom' : snap.type === 'left' ? 'left' : 'right';
                      const ratio = (side === 'top' || side === 'bottom')
                        ? (snap.x - movedNode.x) / (movedNode.width || 1)
                        : (snap.y - movedNode.y) / (movedNode.height || 1);
                      updateShape(arrow.id, { 
                        sourceAttach: { side, ratio },
                        points: [x1, y1, x2, y2]
                      });
                      needsUpdate = false; // 已经在上面更新了
                    }
                  }
                }
                
                // 更新终点：如果连接到节点，优先使用 attach 信息固定到连接点
                if (endNodeId && movedNodes.has(endNodeId)) {
                  const movedNode = movedNodes.get(endNodeId);
                  if ((arrow as any).targetAttach) {
                    // 有 attach 信息，直接使用固定到连接点
                    const a = (arrow as any).targetAttach; const w = movedNode.width || 0; const h = movedNode.height || 0;
                    if (a.side === 'top') { x2 = movedNode.x + a.ratio * w; y2 = movedNode.y; }
                    if (a.side === 'bottom') { x2 = movedNode.x + a.ratio * w; y2 = movedNode.y + h; }
                    if (a.side === 'left') { x2 = movedNode.x; y2 = movedNode.y + a.ratio * h; }
                    if (a.side === 'right') { x2 = movedNode.x + w; y2 = movedNode.y + a.ratio * h; }
                    needsUpdate = true;
                  } else {
                    // 没有 attach 信息，计算并更新 attach 信息
                    const snap = findNearestPointOnShapeEdge(x2, y2, [movedNode], 1000000);
                    if (snap) {
                      x2 = snap.x;
                      y2 = snap.y;
                      // 计算并更新 attach 信息
                      const side = snap.type === 'top' ? 'top' : snap.type === 'bottom' ? 'bottom' : snap.type === 'left' ? 'left' : 'right';
                      const ratio = (side === 'top' || side === 'bottom')
                        ? (snap.x - movedNode.x) / (movedNode.width || 1)
                        : (snap.y - movedNode.y) / (movedNode.height || 1);
                      updateShape(arrow.id, { 
                        targetAttach: { side, ratio },
                        points: [x1, y1, x2, y2]
                      });
                      needsUpdate = false; // 已经在上面更新了
                    }
                  }
                }
                
                if (needsUpdate) {
                updateShape(arrow.id, { points: [x1, y1, x2, y2] });
                }
              });
              // 3) 对自由箭头端点做最终同步：两端都在容器内则两端一起移动；仅一端在内则移动该端
              // 跳过已经在步骤2中更新过的箭头（两端都连接到容器内节点的箭头）
              const allArrows = shapes.filter(s => s.type === 'arrow') as any[];
              const updatedArrowIds = new Set(arrowsToUpdate.keys());
              
              allArrows.forEach(arrow => {
                // 如果箭头已经在步骤2中更新过，跳过
                if (updatedArrowIds.has(arrow.id)) {
                  return;
                }
                
                const pts = arrow.points || [0, 0, 0, 0];
                let [x1, y1, x2, y2] = pts;
                const startNodeId = (arrow as any).sourceNodeId || (arrow as any).startNodeId;
                const endNodeId = (arrow as any).targetNodeId || (arrow as any).endNodeId;
                
                // 检查起点连接的节点是否在容器内
                const sourceNodeInContainer = startNodeId ? (() => {
                  const sourceNode = shapes.find(s => s.id === startNodeId);
                  return sourceNode && (sourceNode as any).parentContainerId === containerId;
                })() : false;
                
                // 检查终点连接的节点是否在容器内
                const targetNodeInContainer = endNodeId ? (() => {
                  const targetNode = shapes.find(s => s.id === endNodeId);
                  return targetNode && (targetNode as any).parentContainerId === containerId;
                })() : false;
                
                // 使用旧的容器位置来检查端点是否在容器内（因为箭头端点还是旧坐标）
                const startInside = x1 >= oldCx && x1 <= oldCx + cw && y1 >= oldCy && y1 <= oldCy + ch;
                const endInside = x2 >= oldCx && x2 <= oldCx + cw && y2 >= oldCy && y2 <= oldCy + ch;
                
                let moved = false;
                // 如果起点在容器内，且（未连接到节点 或 连接到容器外的节点），则移动
                if (startInside && !sourceNodeInContainer) {
                  x1 = x1 + dx;
                  y1 = y1 + dy;
                  moved = true;
                }
                
                // 如果终点在容器内，且（未连接到节点 或 连接到容器外的节点），则移动
                if (endInside && !targetNodeInContainer) {
                  x2 = x2 + dx;
                  y2 = y2 + dy;
                  moved = true;
                }
                
                if (moved) {
                  updateShape(arrow.id, { points: [x1, y1, x2, y2] });
                }
              });
            }}
            onResize={(id, w, h) => {
              updateShape(id, { width: w, height: h });
              const container = shapes.find(s => s.id === id);
              const cx = (container?.x || 0);
              const cy = (container?.y || 0);
              updateNodesParentByContainerBounds(id, cx, cy, w, h);
            }}
            onResizeEnd={(id, w, h) => {
              updateShape(id, { width: w, height: h });
              const container = shapes.find(s => s.id === id);
              const cx = (container?.x || 0);
              const cy = (container?.y || 0);
              updateNodesParentByContainerBounds(id, cx, cy, w, h);
            }}
          />
        );
      case 'arrow':
        return (
          <Arrow
            key={shape.id}
            data={shape}
            isSelected={isSelected}
            isDragging={isDragging}
            onDragEnd={handleShapeDragEnd}
            onSelect={handleShapeSelect}
            onUpdatePoints={handleArrowPointsUpdate}
          />
        );
      case 'node':
        return (
          <Node
            key={shape.id}
            data={shape}
            isSelected={isSelected}
            isDragging={isDragging}
            onDragEnd={(e, nodeId) => {
              // 先执行原有的箭头同步与吸附逻辑
              handleShapeDragEnd(e, nodeId);
              // 再检查归属：如果落在某容器内则归属该容器，否则清空归属
              // 注意：使用 e.target 获取最终位置，而不是从 shapes 读取（因为 updateShape 是异步的）
              const target = e.target;
              const finalX = target.x();
              const finalY = target.y();
              const node = shapes.find(s => s.id === nodeId);
              if (!node) return;
              const nodeWidth = node.width || 0;
              const nodeHeight = node.height || 0;
              const nodeCenterX = finalX + nodeWidth / 2;
              const nodeCenterY = finalY + nodeHeight / 2;
              const containers = shapes.filter(s => s.type === 'container' && (s.width || 0) > 0 && (s.height || 0) > 0);
              const hit = containers.find(c => {
                const inX = nodeCenterX >= (c.x || 0) && nodeCenterX <= (c.x || 0) + (c.width || 0);
                const inY = nodeCenterY >= (c.y || 0) && nodeCenterY <= (c.y || 0) + (c.height || 0);
                return inX && inY;
              });
              const currentParent = (node as any).parentContainerId || null;
              const newParent = hit ? hit.id : null;
              if (currentParent !== newParent) {
                updateShape(nodeId, { parentContainerId: newParent });
              }
            }}
            onDragMove={(e, nodeId) => {
              // 实时更新与该节点相连的箭头端点，保持连接在同一边同一比例位置
              const target = e.target; const nx = target.x(); const ny = target.y();
              const movedNode = { ...shape, x: nx, y: ny } as any;
              const connectedArrows = shapes.filter(s => s.type === 'arrow' && (
                (s as any).sourceNodeId === nodeId || (s as any).targetNodeId === nodeId ||
                (s as any).startNodeId === nodeId || (s as any).endNodeId === nodeId
              ));
              connectedArrows.forEach(arrow => {
                const pts = arrow.points || [0, 0, 0, 0];
                let [x1, y1, x2, y2] = pts;
                const w = movedNode.width || 0;
                const h = movedNode.height || 0;
                
                // 更新起点：如果连接到节点，优先使用 attach 信息固定到连接点
                if ((arrow as any).sourceNodeId === nodeId || (arrow as any).startNodeId === nodeId) {
                  if ((arrow as any).sourceAttach) {
                    // 有 attach 信息，直接使用固定到连接点
                    const a = (arrow as any).sourceAttach;
                  if (a.side === 'top') { x1 = movedNode.x + a.ratio * w; y1 = movedNode.y; }
                  if (a.side === 'bottom') { x1 = movedNode.x + a.ratio * w; y1 = movedNode.y + h; }
                  if (a.side === 'left') { x1 = movedNode.x; y1 = movedNode.y + a.ratio * h; }
                  if (a.side === 'right') { x1 = movedNode.x + w; y1 = movedNode.y + a.ratio * h; }
                  } else {
                    // 没有 attach 信息，计算并更新 attach 信息
                  const snap = findNearestPointOnShapeEdge(x1, y1, [movedNode], 1000000);
                    if (snap) {
                      x1 = snap.x;
                      y1 = snap.y;
                      // 计算并更新 attach 信息
                      const side = snap.type === 'top' ? 'top' : snap.type === 'bottom' ? 'bottom' : snap.type === 'left' ? 'left' : 'right';
                      const ratio = (side === 'top' || side === 'bottom')
                        ? (snap.x - movedNode.x) / w
                        : (snap.y - movedNode.y) / h;
                      updateShape(arrow.id, { 
                        sourceAttach: { side, ratio },
                        points: [x1, y1, x2, y2]
                      });
                      return; // 已经在上面更新了
                    }
                  }
                }

                // 更新终点：如果连接到节点，优先使用 attach 信息固定到连接点
                if ((arrow as any).targetNodeId === nodeId || (arrow as any).endNodeId === nodeId) {
                  if ((arrow as any).targetAttach) {
                    // 有 attach 信息，直接使用固定到连接点
                    const a = (arrow as any).targetAttach;
                  if (a.side === 'top') { x2 = movedNode.x + a.ratio * w; y2 = movedNode.y; }
                  if (a.side === 'bottom') { x2 = movedNode.x + a.ratio * w; y2 = movedNode.y + h; }
                  if (a.side === 'left') { x2 = movedNode.x; y2 = movedNode.y + a.ratio * h; }
                  if (a.side === 'right') { x2 = movedNode.x + w; y2 = movedNode.y + a.ratio * h; }
                  } else {
                    // 没有 attach 信息，计算并更新 attach 信息
                  const snap = findNearestPointOnShapeEdge(x2, y2, [movedNode], 1000000);
                    if (snap) {
                      x2 = snap.x;
                      y2 = snap.y;
                      // 计算并更新 attach 信息
                      const side = snap.type === 'top' ? 'top' : snap.type === 'bottom' ? 'bottom' : snap.type === 'left' ? 'left' : 'right';
                      const ratio = (side === 'top' || side === 'bottom')
                        ? (snap.x - movedNode.x) / w
                        : (snap.y - movedNode.y) / h;
                      updateShape(arrow.id, { 
                        targetAttach: { side, ratio },
                        points: [x1, y1, x2, y2]
                      });
                      return; // 已经在上面更新了
                    }
                  }
                }
                
                updateShape(arrow.id, { points: [x1, y1, x2, y2] });
              });
            }}
            onResize={(id, w, h) => {
              updateShape(id, { width: w, height: h });
            }}
            onResizeEnd={(id, w, h) => {
              updateShape(id, { width: w, height: h });
            }}
            onSelect={handleShapeSelect}
            onConnectionPointClick={(nodeId, pointId) => {
              console.log('Connection point clicked:', nodeId, pointId);
              // 这里可以实现连接逻辑
            }}
          />
        );
      case 'start':
        return (
          <Start
            key={shape.id}
            data={shape}
            isSelected={isSelected}
            isDragging={isDragging}
            onDragEnd={(e, nodeId) => {
              handleShapeDragEnd(e, nodeId);
              // 注意：使用 e.target 获取最终位置，而不是从 shapes 读取（因为 updateShape 是异步的）
              const target = e.target;
              const finalX = target.x();
              const finalY = target.y();
              const node = shapes.find(s => s.id === nodeId);
              if (!node) return;
              const nodeWidth = node.width || 0;
              const nodeHeight = node.height || 0;
              const nodeCenterX = finalX + nodeWidth / 2;
              const nodeCenterY = finalY + nodeHeight / 2;
              const containers = shapes.filter(s => s.type === 'container' && (s.width || 0) > 0 && (s.height || 0) > 0);
              const hit = containers.find(c => {
                const inX = nodeCenterX >= (c.x || 0) && nodeCenterX <= (c.x || 0) + (c.width || 0);
                const inY = nodeCenterY >= (c.y || 0) && nodeCenterY <= (c.y || 0) + (c.height || 0);
                return inX && inY;
              });
              const currentParent = (node as any).parentContainerId || null;
              const newParent = hit ? hit.id : null;
              if (currentParent !== newParent) {
                updateShape(nodeId, { parentContainerId: newParent });
              }
            }}
            onDragMove={(e, nodeId) => {
              const target = e.target; const nx = target.x(); const ny = target.y();
              const movedNode = { ...shape, x: nx, y: ny } as any;
              const connectedArrows = shapes.filter(s => s.type === 'arrow' && (
                (s as any).sourceNodeId === nodeId || (s as any).targetNodeId === nodeId ||
                (s as any).startNodeId === nodeId || (s as any).endNodeId === nodeId
              ));
              connectedArrows.forEach(arrow => {
                const pts = arrow.points || [0, 0, 0, 0];
                let [x1, y1, x2, y2] = pts;
                const w = movedNode.width || 0;
                const h = movedNode.height || 0;
                
                // 更新起点：如果连接到节点，优先使用 attach 信息固定到连接点
                if ((arrow as any).sourceNodeId === nodeId || (arrow as any).startNodeId === nodeId) {
                  if ((arrow as any).sourceAttach) {
                    // 有 attach 信息，直接使用固定到连接点
                    const a = (arrow as any).sourceAttach;
                  if (a.side === 'top') { x1 = movedNode.x + a.ratio * w; y1 = movedNode.y; }
                  if (a.side === 'bottom') { x1 = movedNode.x + a.ratio * w; y1 = movedNode.y + h; }
                  if (a.side === 'left') { x1 = movedNode.x; y1 = movedNode.y + a.ratio * h; }
                  if (a.side === 'right') { x1 = movedNode.x + w; y1 = movedNode.y + a.ratio * h; }
                  } else {
                    // 没有 attach 信息，计算并更新 attach 信息
                  const snap = findNearestPointOnShapeEdge(x1, y1, [movedNode], 1000000);
                    if (snap) {
                      x1 = snap.x;
                      y1 = snap.y;
                      // 计算并更新 attach 信息
                      const side = snap.type === 'top' ? 'top' : snap.type === 'bottom' ? 'bottom' : snap.type === 'left' ? 'left' : 'right';
                      const ratio = (side === 'top' || side === 'bottom')
                        ? (snap.x - movedNode.x) / w
                        : (snap.y - movedNode.y) / h;
                      updateShape(arrow.id, { 
                        sourceAttach: { side, ratio },
                        points: [x1, y1, x2, y2]
                      });
                      return; // 已经在上面更新了
                    }
                  }
                }
                
                // 更新终点：如果连接到节点，优先使用 attach 信息固定到连接点
                if ((arrow as any).targetNodeId === nodeId || (arrow as any).endNodeId === nodeId) {
                  if ((arrow as any).targetAttach) {
                    // 有 attach 信息，直接使用固定到连接点
                    const a = (arrow as any).targetAttach;
                  if (a.side === 'top') { x2 = movedNode.x + a.ratio * w; y2 = movedNode.y; }
                  if (a.side === 'bottom') { x2 = movedNode.x + a.ratio * w; y2 = movedNode.y + h; }
                  if (a.side === 'left') { x2 = movedNode.x; y2 = movedNode.y + a.ratio * h; }
                  if (a.side === 'right') { x2 = movedNode.x + w; y2 = movedNode.y + a.ratio * h; }
                  } else {
                    // 没有 attach 信息，计算并更新 attach 信息
                  const snap = findNearestPointOnShapeEdge(x2, y2, [movedNode], 1000000);
                    if (snap) {
                      x2 = snap.x;
                      y2 = snap.y;
                      // 计算并更新 attach 信息
                      const side = snap.type === 'top' ? 'top' : snap.type === 'bottom' ? 'bottom' : snap.type === 'left' ? 'left' : 'right';
                      const ratio = (side === 'top' || side === 'bottom')
                        ? (snap.x - movedNode.x) / w
                        : (snap.y - movedNode.y) / h;
                      updateShape(arrow.id, { 
                        targetAttach: { side, ratio },
                        points: [x1, y1, x2, y2]
                      });
                      return; // 已经在上面更新了
                    }
                  }
                }
                
                updateShape(arrow.id, { points: [x1, y1, x2, y2] });
              });
            }}
            onResize={(id, w, h) => {
              updateShape(id, { width: w, height: h });
            }}
            onResizeEnd={(id, w, h) => {
              updateShape(id, { width: w, height: h });
            }}
            onSelect={handleShapeSelect}
            onConnectionPointClick={() => {}}
          />
        );
      default:
        return null;
    }
  }, [selectedShapeIds, handleShapeDragEnd, handleShapeSelect, handleArrowPointsUpdate]);

  return (
    <div className={`${styles.canvasContainer} ${isPanning ? styles.panning : ''}`}>
      <CanvasAppBar
        onHome={() => navigate('/')}
        onSave={handleSaveProject}
        onLoad={handleLoadProject}
        onPrev={async () => {
          const ordered = shapes
            .filter(s => s.type === 'arrow' && typeof (s as any).order === 'number')
            .sort((a: any, b: any) => (a.order as number) - (b.order as number));
          if (ordered.length === 0) return;
          if (!(window as any).__arrowIdx && (window as any).__arrowIdx !== 0) (window as any).__arrowIdx = 0;
          (window as any).__arrowIdx = Math.max(0, (window as any).__arrowIdx - 1);
          const target = ordered[(window as any).__arrowIdx];
          // 高亮当前，取消上一个
          if ((window as any).__lastFocusedArrowId && (window as any).__lastFocusedArrowId !== target.id) {
            updateShape((window as any).__lastFocusedArrowId, { focused: false } as any);
          }
          updateShape(target.id, { focused: true } as any);
          (window as any).__lastFocusedArrowId = target.id;
          const pts = target.points || [0, 0, 0, 0];
          const xs = pts.filter((_, i) => i % 2 === 0);
          const ys = pts.filter((_, i) => i % 2 === 1);
          const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
          const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
          const start = { x: camera.x, y: camera.y, scale: camera.scale };
          // 使世界坐标(cx, cy) 居中：x = stageW/2 - cx*scale, y = stageH/2 - cy*scale
          const end = { x: stageSize.width / 2 - cx * camera.scale, y: stageSize.height / 2 - cy * camera.scale, scale: camera.scale };
          const duration = 400;
          const begin = performance.now();
          const animate = (t: number) => {
            const p = Math.min(1, (t - begin) / duration);
            const ease = 0.5 - Math.cos(p * Math.PI) / 2;
            setCamera({
              x: start.x + (end.x - start.x) * ease,
              y: start.y + (end.y - start.y) * ease,
              scale: start.scale + (end.scale - start.scale) * ease,
            });
            if (p < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }}
        onNext={async () => {
          const ordered = shapes
            .filter(s => s.type === 'arrow' && typeof (s as any).order === 'number')
            .sort((a: any, b: any) => (a.order as number) - (b.order as number));
          if (ordered.length === 0) return;
          if (!(window as any).__arrowIdx && (window as any).__arrowIdx !== 0) (window as any).__arrowIdx = -1;
          (window as any).__arrowIdx = Math.min(ordered.length - 1, (window as any).__arrowIdx + 1);
          const target = ordered[(window as any).__arrowIdx];
          if ((window as any).__lastFocusedArrowId && (window as any).__lastFocusedArrowId !== target.id) {
            updateShape((window as any).__lastFocusedArrowId, { focused: false } as any);
          }
          updateShape(target.id, { focused: true } as any);
          (window as any).__lastFocusedArrowId = target.id;
          const pts = target.points || [0, 0, 0, 0];
          const xs = pts.filter((_, i) => i % 2 === 0);
          const ys = pts.filter((_, i) => i % 2 === 1);
          const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
          const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
          const start = { x: camera.x, y: camera.y, scale: camera.scale };
          const end = { x: stageSize.width / 2 - cx * camera.scale, y: stageSize.height / 2 - cy * camera.scale, scale: camera.scale };
          const duration = 400;
          const begin = performance.now();
          const animate = (t: number) => {
            const p = Math.min(1, (t - begin) / duration);
            const ease = 0.5 - Math.cos(p * Math.PI) / 2;
            setCamera({
              x: start.x + (end.x - start.x) * ease,
              y: start.y + (end.y - start.y) * ease,
              scale: start.scale + (end.scale - start.scale) * ease,
            });
            if (p < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }}
        onRun={async () => {
          // 1. 先清除所有箭头状态
          const arrows = shapes.filter(s => s.type === 'arrow');
          arrows.forEach(arrow => {
            updateShape(arrow.id, { validationStatus: null });
          });

          // 2. 运行：从起点沿箭头验证输入输出并传递数据
          const shapesNow = [...shapes];
          const nodesById = new Map(shapesNow.filter(s => s.type === 'node' || s.type === 'start').map(s => [s.id, s]));
          const arrowsNow = shapesNow.filter(s => s.type === 'arrow');
          const outgoing = new Map<string, any[]>(
            [...nodesById.keys()].map(id => [id, arrowsNow.filter(a => (a as any).sourceNodeId === id || (a as any).startNodeId === id)])
          );

          // 解析 API 返回结果，转换为对象结构（类似 Spring Boot 的 @ResponseBody）
          const parseApiResult = (apiResult: any): Record<string, any> => {
            if (!apiResult) return {};
            // 如果是对象，直接使用
            if (typeof apiResult === 'object' && !Array.isArray(apiResult)) {
              return apiResult;
            }
            // 如果是数组，提取第一个元素作为主要数据（常见场景：API 返回 [{...}]）
            if (Array.isArray(apiResult)) {
              return apiResult.length > 0 ? { ...apiResult[0], _array: apiResult } : {};
            }
            // 如果是字符串，尝试解析 JSON
            if (typeof apiResult === 'string') {
              try {
                const parsed = JSON.parse(apiResult);
                return parseApiResult(parsed); // 递归处理解析后的结果
              } catch {
                return { value: apiResult };
              }
            }
            // 其他类型，包装成对象
            return { value: apiResult };
          };

          // 获取节点的输出数据（类似 Spring Boot 的返回对象）
          const getOutputData = (node: any): Record<string, any> => {
            const mode = node.outputMode || (node.outputDataEnabled ? 'custom' : (node.apiUseAsOutput ? 'api' : 'props'));
            
            if (mode === 'props') {
              // Props 模式：从 outputProps 和 outputData 构建数据对象
              // 类似 Spring Boot 的 @ResponseBody，返回的是键值对
              const props = (node.outputProps || []).filter((k: string) => !!k);
              const data: Record<string, any> = {};
              props.forEach((prop: string) => {
                // 优先从 outputData 中获取值
                if (node.outputData && node.outputData[prop] !== undefined) {
                  data[prop] = node.outputData[prop];
                }
              });
              return data;
            }
            
            if (mode === 'api') {
              // API 模式：解析 API 返回结果
              const apiResult = node.outputData?.apiResult;
              if (apiResult) {
                return parseApiResult(apiResult);
              }
              return {};
            }
            
            // Custom 模式：直接使用 outputData
            const data = node.outputData;
            return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
          };

          // 递归检查嵌套对象结构是否匹配（类似 Spring Boot 的 @RequestBody 验证）
          const checkStructureMatch = (source: any, target: any, path: string = ''): { match: boolean; missing: string[] } => {
            const missing: string[] = [];
            
            // 如果目标不是对象，跳过结构检查（允许任意类型）
            if (!target || typeof target !== 'object' || Array.isArray(target)) {
              return { match: true, missing: [] };
            }
            
            // 如果源不是对象，不匹配
            if (!source || typeof source !== 'object' || Array.isArray(source)) {
              return { match: false, missing: [path || 'root'] };
            }
            
            // 递归检查每个键
            for (const key in target) {
              const fullPath = path ? `${path}.${key}` : key;
              const targetValue = target[key];
              const sourceValue = source[key];
              
              // 如果目标值也是对象，递归检查
              if (targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
                const nested = checkStructureMatch(sourceValue || {}, targetValue, fullPath);
                if (!nested.match) {
                  missing.push(...nested.missing);
                }
              } else {
                // 叶子节点：检查源数据是否有这个键
                if (sourceValue === undefined) {
                  missing.push(fullPath);
                }
              }
            }
            
            return { match: missing.length === 0, missing };
          };

          // 验证数据匹配（类似 Spring Boot 的参数绑定验证）
          const validateDataMatch = (sourceData: Record<string, any>, targetNode: any, sourceNode: any): { match: boolean; missing: string[]; message: string } => {
            const mode = targetNode.inputMode || (targetNode.inputDataEnabled ? 'custom' : 'props');
            
            if (mode === 'props') {
              // Props 模式：类似 @RequestParam，基于属性名的精确匹配
              // 只验证属性名是否匹配，不验证值是否存在
              const requiredProps = (targetNode.inputProps || []).filter((k: string) => !!k);
              
              // 获取源节点的输出属性列表（属性名列表）
              const sourceOutputMode = sourceNode.outputMode || (sourceNode.outputDataEnabled ? 'custom' : (sourceNode.apiUseAsOutput ? 'api' : 'props'));
              let sourceOutputProps: string[] = [];
              
              if (sourceOutputMode === 'props') {
                // Props 模式：直接从 outputProps 获取属性名列表
                sourceOutputProps = (sourceNode.outputProps || []).filter((k: string) => !!k);
              } else if (sourceOutputMode === 'api') {
                // API 模式：从解析后的数据中获取属性名
                sourceOutputProps = Object.keys(sourceData).filter(k => k !== '_array');
              } else {
                // Custom 模式：从数据对象中获取属性名
                sourceOutputProps = Object.keys(sourceData);
              }
              
              const sourcePropsSet = new Set(sourceOutputProps);
              const missing = requiredProps.filter(prop => !sourcePropsSet.has(prop));
              
              if (missing.length === 0) {
                return { match: true, missing: [], message: '参数匹配成功' };
              }
              return { 
                match: false, 
                missing, 
                message: `缺少必需参数: ${missing.join(', ')}` 
              };
            }
            
            // Custom 模式：类似 @RequestBody，递归检查对象结构
            const expectedStructure = targetNode.inputData;
            if (expectedStructure && typeof expectedStructure === 'object' && !Array.isArray(expectedStructure)) {
              const result = checkStructureMatch(sourceData, expectedStructure);
              return {
                match: result.match,
                missing: result.missing,
                message: result.match 
                  ? '数据结构匹配成功' 
                  : `缺少必需字段: ${result.missing.join(', ')}`
              };
            }
            
            // 如果没有定义输入结构，允许任意输入
            return { match: true, missing: [], message: '允许任意输入' };
          };

          // 从数据对象中提取属性名
          const extractProperties = (data: any): string[] => {
            if (!data) return [];
            // 如果是对象，提取所有键
            if (typeof data === 'object' && !Array.isArray(data)) {
              return Object.keys(data).filter(k => k !== '_array'); // 排除内部数组标记
            }
            // 如果是数组，提取第一个元素的键
            if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
              return Object.keys(data[0]);
            }
            return [];
          };

          // 运行API获取输出数据
          const runApiIfNeeded = async (node: any) => {
            const mode = node.outputMode || (node.outputDataEnabled ? 'custom' : (node.apiUseAsOutput ? 'api' : 'props'));
            if (mode !== 'api') return;
            if (!node.apiEnabled || !node.apiUrl) return;
            try {
              const method = node.apiMethod || 'GET';
              const headers: Record<string, string> = { 'Content-Type': 'application/json' };
              const init: RequestInit = { method, headers };
              if (method !== 'GET' && node.apiBody) init.body = node.apiBody;
              const res = await fetch(node.apiUrl, init);
              const text = await res.text();
              let data: any = text; try { data = JSON.parse(text); } catch {}
              const newOutput = { ...(node.outputData || {}), apiResult: data };
              updateShape(node.id, { outputData: newOutput, lastRunAt: Date.now() });
              node.outputData = newOutput;
              
              // 如果使用 API 作为输出，并且是 props 模式，自动提取属性名
              if (mode === 'api' || mode === 'props') {
                const parsedData = parseApiResult(data);
                const properties = extractProperties(parsedData);
                if (properties.length > 0) {
                  // 提取属性名并更新 outputProps（只添加新的属性，保留已有的）
                  const existingProps = (node.outputProps || []).filter(p => !!p);
                  const newProps = [...new Set([...existingProps, ...properties])]; // 去重合并
                  updateShape(node.id, { outputProps: newProps });
                  node.outputProps = newProps;
                }
              }
            } catch (e) {
              const newOutput = { ...(node.outputData || {}), apiError: String(e) };
              updateShape(node.id, { outputData: newOutput, lastRunAt: Date.now() });
              node.outputData = newOutput;
            }
          };

          // 传递数据到目标节点（类似 Spring Boot 的参数绑定）
          const passDataToTarget = (sourceData: Record<string, any>, targetNode: any) => {
            const mode = targetNode.inputMode || (targetNode.inputDataEnabled ? 'custom' : 'props');
            
            if (mode === 'props') {
              // Props 模式：类似 @RequestParam，按属性名精确绑定
              const inputProps = (targetNode.inputProps || []).filter((k: string) => !!k);
              const newInputData: Record<string, any> = {};
              inputProps.forEach((prop: string) => {
                // 自动绑定：如果源数据有对应属性，就传递；否则传递 undefined（用户可以在节点内设置默认值）
                if (sourceData[prop] !== undefined) {
                  newInputData[prop] = sourceData[prop];
                }
              });
              updateShape(targetNode.id, { inputData: newInputData });
              targetNode.inputData = newInputData;
            } else {
              // Custom 模式：类似 @RequestBody，传递完整对象
              // 如果目标定义了期望结构，只传递匹配的部分；否则传递全部
              const expectedStructure = targetNode.inputData;
              if (expectedStructure && typeof expectedStructure === 'object' && !Array.isArray(expectedStructure)) {
                // 只传递期望结构中定义的字段（保持嵌套结构）
                const extractMatchingFields = (source: any, target: any): any => {
                  if (!target || typeof target !== 'object' || Array.isArray(target)) {
                    return source; // 如果目标不是对象，返回源数据
                  }
                  const result: Record<string, any> = {};
                  for (const key in target) {
                    if (source && source[key] !== undefined) {
                      const targetValue = target[key];
                      if (targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
                        // 嵌套对象，递归提取
                        result[key] = extractMatchingFields(source[key], targetValue);
                      } else {
                        // 叶子节点，直接赋值
                        result[key] = source[key];
                      }
                    }
                  }
                  return result;
                };
                const matchedData = extractMatchingFields(sourceData, expectedStructure);
                updateShape(targetNode.id, { inputData: matchedData });
                targetNode.inputData = matchedData;
              } else {
                // 没有期望结构，传递全部数据
                updateShape(targetNode.id, { inputData: { ...sourceData } });
                targetNode.inputData = { ...sourceData };
              }
            }
          };

          // 等待箭头动画完成的辅助函数
          const waitForArrowAnimation = (arrowId: string, status: 'success' | 'error'): Promise<void> => {
            return new Promise((resolve) => {
              updateShape(arrowId, { validationStatus: status });
              // 等待动画完成（300ms）
              setTimeout(() => {
                resolve();
              }, 300);
            });
          };

          // 从起点开始遍历（顺序执行，等待每个箭头动画完成）
          const starts = shapesNow.filter(s => s.type === 'start');
          for (const start of starts) {
            const queue: Array<{ nodeId: string; sourceNode?: any }> = [{ nodeId: start.id }];
            const visited = new Set<string>();
            
            while (queue.length) {
              const { nodeId: currentId } = queue.shift()!;
              if (visited.has(currentId)) continue;
              visited.add(currentId);
              const currentNode = nodesById.get(currentId);
              if (!currentNode) continue;

              // 运行API获取输出（如果需要）
              await runApiIfNeeded(currentNode);

              // 获取源节点的输出数据
              const sourceOutputData = getOutputData(currentNode);

              // 处理所有从当前节点出发的箭头（按顺序，等待每个动画完成）
              const outs = outgoing.get(currentId) || [];
          // 根据箭头的 order 字段进行排序：数值越小越先运行；未设置的排在最后，保持原有相对顺序
          const sortedOuts = [...outs].sort((a: any, b: any) => {
            const ao = typeof a.order === 'number' ? a.order : Number.POSITIVE_INFINITY;
            const bo = typeof b.order === 'number' ? b.order : Number.POSITIVE_INFINITY;
            if (ao === bo) return 0;
            return ao - bo;
          });
          for (const arr of sortedOuts) {
                const arrowId = arr.id;
                const targetId = (arr as any).targetNodeId || (arr as any).endNodeId;
                if (!targetId) {
                  // 箭头未连接到目标，标记为错误并等待动画
                  await waitForArrowAnimation(arrowId, 'error');
                  continue;
                }

                const targetNode = nodesById.get(targetId);
                if (!targetNode) {
                  await waitForArrowAnimation(arrowId, 'error');
                  continue;
                }

                // 标记箭头为验证中
                updateShape(arrowId, { validationStatus: 'pending' });

                // 验证数据匹配（类似 Spring Boot 的参数绑定验证）
                const validation = validateDataMatch(sourceOutputData, targetNode, currentNode);

                if (validation.match) {
                  // 验证成功：箭头变绿，传递数据，等待动画完成后再继续
                  await waitForArrowAnimation(arrowId, 'success');
                  passDataToTarget(sourceOutputData, targetNode);
                  console.log(`[RUN] ${currentNode.title || currentNode.id} -> ${targetNode.title || targetId}: ✅ ${validation.message}`);
                  queue.push({ nodeId: targetId });
                } else {
                  // 验证失败：箭头变红，等待动画完成
                  await waitForArrowAnimation(arrowId, 'error');
                  console.warn(`[RUN] ${currentNode.title || currentNode.id} -> ${targetNode.title || targetId}: ❌ ${validation.message}`, validation.missing);
                }
              }
            }
          }
          if (starts.length === 0) {
            console.warn('未找到起点组件');
          }
        }}
      />
      <Toolbar 
        onDragStart={handleDragStart}
      />

      <div
        className={styles.stageContainer}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <GridBackground
          scale={camera.scale}
          offsetX={camera.x}
          offsetY={camera.y}
          stageWidth={stageSize.width}
          stageHeight={stageSize.height}
        />
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          // 仅在平移模式开启时让 Stage 进入拖拽
          draggable={isPanning}
          onDragStart={(e) => {
            // 确保Konva内部拖拽不会改变Stage位置
            const stage = e.target.getStage();
            if (stage) {
              stage.position({ x: 0, y: 0 });
            }
          }}
          onDragMove={(e) => {
            if (!isPanning) return;
            const evt = e.evt as MouseEvent;
            const dx = evt.clientX - panRef.current.lastX;
            const dy = evt.clientY - panRef.current.lastY;
            panRef.current.lastX = evt.clientX;
            panRef.current.lastY = evt.clientY;
          // 改为命令式：合并到 RAF
          panDeltaRef.current.dx += dx;
          panDeltaRef.current.dy += dy;
          if (!panRafRef.current) {
            panRafRef.current = requestAnimationFrame(() => {
              panRafRef.current = 0 as any;
              const layer = layerRef.current;
              if (layer) {
                try {
                  layer.position({ x: (camera.x || 0) + panDeltaRef.current.dx, y: (camera.y || 0) + panDeltaRef.current.dy });
                  layer.getStage()?.batchDraw();
                } catch {}
              }
            });
          }
            const stage = e.target.getStage();
            if (stage) {
              stage.position({ x: 0, y: 0 });
            }
          }}
          onDragEnd={(e) => {
            if (!isPanning) return;
            const stage = e.target.getStage();
            if (stage) {
              stage.position({ x: 0, y: 0 });
            }
          }}
          className={styles.stage}
        >
        <Layer
          ref={layerRef}
          x={camera.x}
          y={camera.y}
          scaleX={camera.scale}
          scaleY={camera.scale}
        >
          {(() => {
            const containers = shapes.filter(s => s.type === 'container');
            const others = shapes.filter(s => s.type !== 'container');
            return [...containers, ...others].map(renderShape);
          })()}
          {drawingShape && renderShape(drawingShape)}
          
          {/* 拖拽预览 - 显示图标 */}
          {dragPreview && (
            <Group>
              {/* 背景圆圈 */}
              <Circle
                x={dragPreview.x}
                y={dragPreview.y}
                radius={30}
                fill="rgba(255, 255, 255, 0.95)"
                stroke="#3b82f6"
                strokeWidth={2}
                shadowBlur={8}
                shadowColor="rgba(0, 0, 0, 0.2)"
                shadowOffset={{ x: 0, y: 2 }}
              />
              
              {/* 图标 */}
              {dragPreview.shapeType === 'node' && (
                <Group>
                  {/* 节点主体 */}
                  <Rect
                    x={dragPreview.x - 16}
                    y={dragPreview.y - 10}
                    width={32}
                    height={20}
                    fill="#3b82f6"
                    cornerRadius={4}
                  />
                  {/* 连接点 */}
                  <Circle x={dragPreview.x - 12} y={dragPreview.y - 6} radius={2} fill="white" />
                  <Circle x={dragPreview.x + 12} y={dragPreview.y - 6} radius={2} fill="white" />
                  <Circle x={dragPreview.x - 12} y={dragPreview.y + 6} radius={2} fill="white" />
                  <Circle x={dragPreview.x + 12} y={dragPreview.y + 6} radius={2} fill="white" />
                </Group>
              )}
              
              {dragPreview.shapeType === 'arrow' && (
                <Group>
                  {/* 箭头线条 */}
                  <Line
                    points={[dragPreview.x - 20, dragPreview.y, dragPreview.x + 20, dragPreview.y]}
                    stroke="#3b82f6"
                    strokeWidth={3}
                    lineCap="round"
                  />
                  {/* 箭头头部 */}
                  <Line
                    points={[dragPreview.x + 12, dragPreview.y - 6, dragPreview.x + 20, dragPreview.y, dragPreview.x + 12, dragPreview.y + 6]}
                    stroke="#3b82f6"
                    strokeWidth={3}
                    lineCap="round"
                    lineJoin="round"
                  />
                </Group>
              )}
            </Group>
          )}
        </Layer>
      </Stage>
      </div>
      
      {selectedShapeForProperties && (
        <PropertyPanel 
          shape={selectedShapeForProperties} 
        />
      )}

      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            background: 'rgba(17, 24, 39, 0.9)',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 1000,
            fontSize: 12,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
};

export default Canvas;
