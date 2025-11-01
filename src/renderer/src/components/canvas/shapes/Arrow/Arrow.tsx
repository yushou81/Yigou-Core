import React, { useMemo, useRef, useState } from 'react';
import { Arrow as KonvaArrow, Group, Circle } from 'react-konva';
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
  const points = useMemo(() => data.points || [0, 0, 0, 0], [data.points]);

  // 缓存整箭头拖拽的起点与原始点集
  const dragOriginRef = useRef<{ startX: number; startY: number; origPoints: number[] } | null>(null);

  const startPoint = useMemo(() => ({ x: points[0], y: points[1] }), [points]);
  const endPoint = useMemo(
    () => ({ x: points[points.length - 2], y: points[points.length - 1] }),
    [points]
  );

  // 根据验证状态和选中状态确定颜色
  const strokeColor = useMemo(() => {
    if (data.validationStatus === 'success') return '#22c55e'; // 绿色-成功
    if (data.validationStatus === 'error') return '#ef4444'; // 红色-失败
    if (data.validationStatus === 'pending') return '#f59e0b'; // 橙色-验证中
    // 默认颜色
    return isSelected ? '#111' : '#555';
  }, [data.validationStatus, isSelected]);
  const strokeWidth = isSelected ? 3 : 2;

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
      <KonvaArrow
        points={points}
        fill={strokeColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        pointerLength={10}
        pointerWidth={10}
        hitStrokeWidth={12}
        perfectDrawEnabled={false}
        listening
      />

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