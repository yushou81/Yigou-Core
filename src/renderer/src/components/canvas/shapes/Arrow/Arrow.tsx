import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Arrow as KonvaArrow, Group, Circle, Line } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { ShapeData } from '../../../../types/canvas';

export interface ArrowProps {
  data: ShapeData;
  isSelected?: boolean;
  isDragging?: boolean;
  onDragEnd?: (e: KonvaEventObject<DragEvent>, id: string) => void;
  onSelect?: (id: string) => void;
  onUpdatePoints?: (id: string, points: number[]) => void;
  className?: string;
}

export const Arrow: React.FC<ArrowProps> = ({
  data,
  isSelected = false,
  isDragging = false,
  onDragEnd,
  onSelect,
  onUpdatePoints,
  className,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isHandleDragging, setIsHandleDragging] = useState<null | 'start' | 'end'>(null);
  const [animationProgress, setAnimationProgress] = useState(0); // 动画进度 0-1
  const animationRef = useRef<number | null>(null);
  const prevStatusRef = useRef<string | null | undefined>(data.validationStatus);
  const points = useMemo(() => data.points || [0, 0, 0, 0], [data.points]);

  // 缓存整箭头拖拽的起点与原始点集
  const dragOriginRef = useRef<{ startX: number; startY: number; origPoints: number[] } | null>(null);

  const startPoint = useMemo(() => ({ x: points[0], y: points[1] }), [points]);
  const endPoint = useMemo(
    () => ({ x: points[points.length - 2], y: points[points.length - 1] }),
    [points]
  );

  // 当验证状态变为 success 或 error 时，触发渐变动画
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    const currentStatus = data.validationStatus;
    
    // 如果从其他状态变为 success 或 error，启动动画
    if ((prevStatus !== 'success' && currentStatus === 'success') ||
        (prevStatus !== 'error' && currentStatus === 'error')) {
      setAnimationProgress(0);
      const startTime = Date.now();
      const duration = 300; // 动画时长 300ms
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setAnimationProgress(progress);
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          animationRef.current = null;
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
    }
    
    // 如果状态不再是 success 或 error，重置动画
    if (currentStatus !== 'success' && currentStatus !== 'error') {
      setAnimationProgress(0);
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }
    
    prevStatusRef.current = currentStatus;
    
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [data.validationStatus]);

  // 根据验证状态和选中状态确定颜色
  const strokeColor = useMemo(() => {
    if (data.validationStatus === 'success') return '#22c55e'; // 绿色-成功
    if (data.validationStatus === 'error') return '#ef4444'; // 红色-失败
    if (data.validationStatus === 'pending') return '#f59e0b'; // 橙色-验证中
    // 默认颜色
    return isSelected ? '#111' : '#555';
  }, [data.validationStatus, isSelected]);
  const strokeWidth = isSelected ? 3 : 2;
  
  const pointerLength = 10; // 箭头头部长度
  
  // 计算箭头的长度和方向
  const arrowLength = useMemo(() => {
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, [startPoint, endPoint]);
  
  // 计算线条部分（不包括箭头头部）的长度
  const lineLength = Math.max(0, arrowLength - pointerLength);
  
  // 计算当前动画已经到达的长度
  const currentAnimatedLength = arrowLength * animationProgress;
  
  // 判断是否到达箭头头部位置
  const hasReachedArrowHead = currentAnimatedLength >= lineLength;
  
  // 计算线条的终点坐标（不包括箭头头部）
  const lineEndPoint = useMemo(() => {
    if ((data.validationStatus === 'success' || data.validationStatus === 'error') && animationProgress < 1) {
      const dx = endPoint.x - startPoint.x;
      const dy = endPoint.y - startPoint.y;
      
      if (!hasReachedArrowHead) {
        // 还没到达箭头位置，只显示线条
        const ratio = currentAnimatedLength / arrowLength;
        return {
          x: startPoint.x + dx * ratio,
          y: startPoint.y + dy * ratio,
        };
      } else {
        // 到达箭头位置，线条显示到箭头起点
        const ratio = lineLength / arrowLength;
        return {
          x: startPoint.x + dx * ratio,
          y: startPoint.y + dy * ratio,
        };
      }
    }
    return null;
  }, [startPoint, endPoint, arrowLength, lineLength, currentAnimatedLength, hasReachedArrowHead, animationProgress, data.validationStatus]);
  
  // 计算箭头头部的显示进度（从50%到100%）
  const arrowHeadProgress = useMemo(() => {
    if (!hasReachedArrowHead) return 0;
    // 箭头头部从50%开始显示到100%
    const arrowHeadAnimatedLength = currentAnimatedLength - lineLength;
    const arrowHeadProgressRatio = Math.min(arrowHeadAnimatedLength / pointerLength, 1);
    // 从0.5到1.0的映射
    return 0.5 + arrowHeadProgressRatio * 0.5;
  }, [hasReachedArrowHead, currentAnimatedLength, lineLength, pointerLength]);

  const handleBodyClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    if (onSelect) onSelect(data.id);
  };

  // 拖动端点句柄：实时更新
  const handleHandleDragStart = (which: 'start' | 'end', e: KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    setIsHandleDragging(which);
  };

  const handleHandleDragMove = (which: 'start' | 'end', e: KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    const abs = (e.target as any).getAbsolutePosition();
    const nx = abs.x;
    const ny = abs.y;

    const sx = points[0];
    const sy = points[1];
    const ex = points[points.length - 2];
    const ey = points[points.length - 1];

    const newPoints = which === 'start' ? [nx, ny, ex, ey] : [sx, sy, nx, ny];
    if (onUpdatePoints) onUpdatePoints(data.id, newPoints);
  };

  const handleHandlesDragEnd = (e: KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    setIsHandleDragging(null);
    if (onDragEnd) onDragEnd(e, data.id);
  };

  // 整体拖动：按位移平移整条箭头
  const handleGroupDragStart = (e: KonvaEventObject<DragEvent>) => {
    const node = e.target;
    dragOriginRef.current = {
      startX: node.x(),
      startY: node.y(),
      origPoints: [...points],
    };
  };

  const handleGroupDragMove = (_e: KonvaEventObject<DragEvent>) => {
    // 拖动中仅让 Group 视觉移动，不实时更新 points，减少 React 重渲染
  };

  const handleGroupDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const node = e.target;
    if (dragOriginRef.current && onUpdatePoints) {
      const dx = node.x() - dragOriginRef.current.startX;
      const dy = node.y() - dragOriginRef.current.startY;
      const translated = dragOriginRef.current.origPoints.map((v, i) => (i % 2 === 0 ? v + dx : v + dy));
      onUpdatePoints(data.id, translated);
    }
    // 复位 Group 位置并触发外部结束回调
    node.position({ x: 0, y: 0 });
    dragOriginRef.current = null;
    if (onDragEnd) onDragEnd(e, data.id);
  };

  // 动画进行中的显示：灰色背景 + 前景颜色（逐渐展开）
  const isAnimating = (data.validationStatus === 'success' || data.validationStatus === 'error') && animationProgress < 1;
  const animationColor = data.validationStatus === 'success' ? '#22c55e' : '#ef4444'; // 绿色或红色

  return (
    <Group
      onClick={handleBodyClick}
      onTap={handleBodyClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={className}
      listening
      draggable={!isHandleDragging}
      onDragStart={handleGroupDragStart}
      onDragMove={handleGroupDragMove}
      onDragEnd={handleGroupDragEnd}
    >
      {/* 背景灰色箭头（完整长度） */}
      {isAnimating && (
        <KonvaArrow
          points={points}
          fill="#999"
          stroke="#999"
          strokeWidth={strokeWidth}
          pointerLength={pointerLength}
          pointerWidth={10}
          hitStrokeWidth={0}
          perfectDrawEnabled={false}
          listening={false}
          opacity={0.3}
        />
      )}
      
      {/* 前景箭头/线条（动画展开，绿色或红色） */}
      {isAnimating ? (
        <>
          {/* 线条部分 */}
          {lineEndPoint && (
            <Line
              points={[startPoint.x, startPoint.y, lineEndPoint.x, lineEndPoint.y]}
              stroke={animationColor}
              strokeWidth={strokeWidth}
              lineCap="round"
              lineJoin="round"
              hitStrokeWidth={12}
              listening
            />
          )}
          
          {/* 箭头头部部分（从一半开始显示到完整） */}
          {hasReachedArrowHead && arrowHeadProgress > 0 && lineEndPoint && (
            <KonvaArrow
              points={[lineEndPoint.x, lineEndPoint.y, endPoint.x, endPoint.y]}
              fill={animationColor}
              stroke={animationColor}
              strokeWidth={strokeWidth}
              pointerLength={pointerLength * arrowHeadProgress}
              pointerWidth={10 * arrowHeadProgress}
              hitStrokeWidth={12}
              perfectDrawEnabled={false}
              listening
            />
          )}
        </>
      ) : (
        <KonvaArrow
          points={points}
          fill={strokeColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          pointerLength={pointerLength}
          pointerWidth={10}
          hitStrokeWidth={12}
          perfectDrawEnabled={false}
          listening
        />
      )}

      {(isSelected || isHovered) && (
        <>
          {/* start handle */}
          <Circle
            x={startPoint.x}
            y={startPoint.y}
            radius={6}
            fill="#fff"
            stroke="#111"
            strokeWidth={1}
            draggable
            onDragStart={(e) => handleHandleDragStart('start', e)}
            onDragMove={(e) => handleHandleDragMove('start', e)}
            onDragEnd={handleHandlesDragEnd}
          />
          {/* end handle */}
          <Circle
            x={endPoint.x}
            y={endPoint.y}
            radius={6}
            fill="#fff"
            stroke="#111"
            strokeWidth={1}
            draggable
            onDragStart={(e) => handleHandleDragStart('end', e)}
            onDragMove={(e) => handleHandleDragMove('end', e)}
            onDragEnd={handleHandlesDragEnd}
          />
        </>
      )}
    </Group>
  );
};

export default Arrow;