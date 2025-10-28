import React, { useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Group, Circle, Rect, Line } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { useCanvas } from '../../../hooks/useCanvas';
import { Toolbar } from '../Toolbar';
import { Arrow } from '../shapes/Arrow';
import { Container } from '../components/Container';
import { Node } from '../shapes/Node';
import { GridBackground } from './GridBackground';
import { PropertyPanel } from '../PropertyPanel';
import { screenToWorld, clampCameraScale, findNearestPointOnShapeEdge } from '../../../utils/canvasUtils';
import { DEFAULT_CANVAS_SETTINGS } from '../../../constants/canvas';
import { createDefaultShape } from '../../../utils/canvasUtils';
import { ShapeType } from '../../../types/canvas';
import styles from './Canvas.module.css';

/**
 * 主画布组件
 */
export const Canvas: React.FC = () => {
  const stageRef = useRef<any>(null);
  const [stageSize, setStageSize] = React.useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
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
  } = useCanvas();

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

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [isDrawing, cancelDrawing, clearSelection]);

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
      
      if (shapeType === 'node') {
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
    const offsetX = shapeType === 'node' ? -50 : -25;
    const offsetY = shapeType === 'node' ? -30 : 0;
    
    const newShape = createDefaultShape(shapeType, worldPos.x + offsetX, worldPos.y + offsetY);
    
    if (shapeType === 'arrow') {
      startDrawing(newShape);
    } else {
      addShape(newShape);
    }
  }, [camera, startDrawing, addShape]);

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
      setCamera({ scale: camera.scale, x: camera.x + dx, y: camera.y + dy });
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
  }, [isPanning, camera, setCamera, isDrawing, drawingShape, getPointerWorldPos, updateDrawingShape, shapes]);

  // 鼠标抬起事件
  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (isDrawing) {
      endDrawing();
    }
  }, [isPanning, isDrawing, endDrawing]);

  // 滚轮缩放事件
  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
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

      // 2) 让所有与该节点相连的箭头端点跟随（保持吸附在边框上）
      const movedNode = { ...shape, x: finalX, y: finalY } as any;
      const connectedArrows = shapes.filter(s => s.type === 'arrow' && (
        (s as any).sourceNodeId === id || (s as any).targetNodeId === id ||
        (s as any).startNodeId === id || (s as any).endNodeId === id
      ));
      connectedArrows.forEach(arrow => {
        const pts = arrow.points || [0, 0, 0, 0];
        let [x1, y1, x2, y2] = pts;
        if ((arrow as any).sourceNodeId === id || (arrow as any).startNodeId === id) {
          const snap = findNearestPointOnShapeEdge(x1, y1, [movedNode], 1000000);
          if (snap) { x1 = snap.x; y1 = snap.y; }
        }
        if ((arrow as any).targetNodeId === id || (arrow as any).endNodeId === id) {
          const snap = findNearestPointOnShapeEdge(x2, y2, [movedNode], 1000000);
          if (snap) { x2 = snap.x; y2 = snap.y; }
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
    setSelectedShapeForProperties(shape || null);
  }, [clearSelection, selectShape, shapes]);

  // 处理箭头点坐标更新：端点靠近 Node 边框时吸附，并记录源/目标节点
  const computeArrowPointsUpdate = useCallback((id: string, newRawPoints: number[]) => {
    const [rawX1, rawY1, rawX2, rawY2] = newRawPoints;
    const nodes = shapes.filter(s => s.type === 'node' && (s.width || 0) > 0 && (s.height || 0) > 0 && s.visible !== false);

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

  // 渲染形状组件
  const renderShape = useCallback((shape: any) => {
    const isSelected = selectedShapeIds.includes(shape.id);
    const isDragging = false; // 可以根据需要实现拖拽状态

    // C4 可视规则：放大显示细节，缩小隐藏容器内细节（跨容器箭头始终显示）
    const showDetailThreshold = 0.5; // 缩放阈值，可抽到配置
    const isZoomedIn = camera.scale >= showDetailThreshold;
    const isInsideHiddenContainer = () => {
      if (!shape.parentContainerId) return false;
      const container = shapes.find(s => s.id === shape.parentContainerId);
      if (!container) return false;
      return !isZoomedIn; // 缩小时隐藏容器内部
    };

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
              updateShape(containerId, { x: nx, y: ny });
            }}
            onDragEnd={(e, containerId) => {
              const target = e.target; const nx = target.x(); const ny = target.y();
              updateShape(containerId, { x: nx, y: ny });
            }}
            onResize={(id, w, h) => {
              updateShape(id, { width: w, height: h });
            }}
            onResizeEnd={(id, w, h) => {
              updateShape(id, { width: w, height: h });
            }}
          />
        );
      case 'arrow':
        // 箭头：如果两端均在某容器内且当前缩放隐藏，则可选择隐藏；跨容器则始终显示
        const sourceContainerId = shapes.find(s => s.id === (shape as any).sourceNodeId)?.parentContainerId || null;
        const targetContainerId = shapes.find(s => s.id === (shape as any).targetNodeId)?.parentContainerId || null;
        const isCrossContainer = sourceContainerId && targetContainerId && sourceContainerId !== targetContainerId;
        const hideArrowForZoom = !isZoomedIn && !isCrossContainer && (sourceContainerId || targetContainerId);
        if (hideArrowForZoom) return null;
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
        if (isInsideHiddenContainer()) return null;
        return (
          <Node
            key={shape.id}
            data={shape}
            isSelected={isSelected}
            isDragging={isDragging}
            onDragEnd={handleShapeDragEnd}
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
                if (((arrow as any).sourceNodeId === nodeId || (arrow as any).startNodeId === nodeId) && (arrow as any).sourceAttach) {
                  const a = (arrow as any).sourceAttach; const w = movedNode.width || 0; const h = movedNode.height || 0;
                  if (a.side === 'top') { x1 = movedNode.x + a.ratio * w; y1 = movedNode.y; }
                  if (a.side === 'bottom') { x1 = movedNode.x + a.ratio * w; y1 = movedNode.y + h; }
                  if (a.side === 'left') { x1 = movedNode.x; y1 = movedNode.y + a.ratio * h; }
                  if (a.side === 'right') { x1 = movedNode.x + w; y1 = movedNode.y + a.ratio * h; }
                } else if ((arrow as any).sourceNodeId === nodeId || (arrow as any).startNodeId === nodeId) {
                  const snap = findNearestPointOnShapeEdge(x1, y1, [movedNode], 1000000);
                  if (snap) { x1 = snap.x; y1 = snap.y; }
                }

                if (((arrow as any).targetNodeId === nodeId || (arrow as any).endNodeId === nodeId) && (arrow as any).targetAttach) {
                  const a = (arrow as any).targetAttach; const w = movedNode.width || 0; const h = movedNode.height || 0;
                  if (a.side === 'top') { x2 = movedNode.x + a.ratio * w; y2 = movedNode.y; }
                  if (a.side === 'bottom') { x2 = movedNode.x + a.ratio * w; y2 = movedNode.y + h; }
                  if (a.side === 'left') { x2 = movedNode.x; y2 = movedNode.y + a.ratio * h; }
                  if (a.side === 'right') { x2 = movedNode.x + w; y2 = movedNode.y + a.ratio * h; }
                } else if ((arrow as any).targetNodeId === nodeId || (arrow as any).endNodeId === nodeId) {
                  const snap = findNearestPointOnShapeEdge(x2, y2, [movedNode], 1000000);
                  if (snap) { x2 = snap.x; y2 = snap.y; }
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
      default:
        return null;
    }
  }, [selectedShapeIds, handleShapeDragEnd, handleShapeSelect, handleArrowPointsUpdate]);

  return (
    <div className={`${styles.canvasContainer} ${isPanning ? styles.panning : ''}`}>
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
            setCamera({ scale: camera.scale, x: camera.x + dx, y: camera.y + dy });
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
          x={camera.x}
          y={camera.y}
          scaleX={camera.scale}
          scaleY={camera.scale}
        >
          <GridBackground
            scale={camera.scale}
            offsetX={camera.x}
            offsetY={camera.y}
            stageWidth={stageSize.width}
            stageHeight={stageSize.height}
          />
          
          {shapes
            // 按容器优先渲染，确保容器在下方
            .slice()
            .sort((a, b) => (a.type === 'container' && b.type !== 'container' ? -1 : 0))
            .map(renderShape)}
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
    </div>
  );
};

export default Canvas;
