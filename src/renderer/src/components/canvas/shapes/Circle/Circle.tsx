import React from 'react';
import { Circle as KonvaCircle } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { ShapeData } from '../../../../types/canvas';

export interface CircleProps {
  data: ShapeData;
  isSelected?: boolean;
  isDragging?: boolean;
  onDragEnd?: (e: KonvaEventObject<DragEvent>, id: string) => void;
  onSelect?: (id: string) => void;
  className?: string;
}

export const Circle: React.FC<CircleProps> = ({
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

  const radius = (data.width || 100) / 2;

  return (
    <KonvaCircle
      x={data.x + radius}
      y={data.y + radius}
      radius={radius}
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

export default Circle;
