import React from 'react';
import { Rect } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { ShapeData } from '../../../../types/canvas';

export interface RectangleProps {
  data: ShapeData;
  isSelected?: boolean;
  isDragging?: boolean;
  onDragEnd?: (e: KonvaEventObject<DragEvent>, id: string) => void;
  onSelect?: (id: string) => void;
  className?: string;
}

export const Rectangle: React.FC<RectangleProps> = ({
  data,
  isSelected = false,
  isDragging = false,
  onDragEnd,
  onSelect,
  className,
}) => {
  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    if (onDragEnd) {
      onDragEnd(e, data.id);
    }
  };

  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true; // 阻止事件冒泡到 Stage
    if (onSelect) {
      onSelect(data.id);
    }
  };

  return (
    <Rect
      x={data.x}
      y={data.y}
      width={data.width}
      height={data.height}
      fill={data.fill}
      stroke={isSelected ? '#007AFF' : data.stroke || 'transparent'}
      strokeWidth={isSelected ? 2 : data.strokeWidth || 0}
      shadowBlur={isDragging ? 10 : 5}
      shadowColor="rgba(0, 0, 0, 0.2)"
      shadowOffset={{ x: 2, y: 2 }}
      draggable={!isDragging}
      onClick={handleClick}
      onDragEnd={handleDragEnd}
      className={className}
    />
  );
};

export default Rectangle;
