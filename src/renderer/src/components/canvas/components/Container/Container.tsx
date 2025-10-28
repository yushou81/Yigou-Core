import React, { useState } from 'react';
import { Group, Rect, Text } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { ShapeData } from '../../../../types/canvas';

export interface ContainerProps {
  data: ShapeData;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onDragEnd?: (e: KonvaEventObject<DragEvent>, id: string) => void;
  onDragMove?: (e: KonvaEventObject<DragEvent>, id: string) => void;
  onResize?: (id: string, width: number, height: number) => void;
  onResizeEnd?: (id: string, width: number, height: number) => void;
}

export const Container: React.FC<ContainerProps> = ({ data, isSelected = false, onSelect, onDragEnd, onDragMove, onResize, onResizeEnd }) => {
  const [isResizing, setIsResizing] = useState(false);
  const width = data.width || 400;
  const height = data.height || 300;
  const title = data.title || 'Container';

  const handleClick = () => {
    if (onSelect) onSelect(data.id);
  };

  return (
    <Group
      x={data.x}
      y={data.y}
      draggable={!isResizing}
      onClick={handleClick}
      onDragMove={(e) => {
        if (isResizing) { (e as any).cancelBubble = true; return; }
        onDragMove && onDragMove(e as unknown as KonvaEventObject<DragEvent>, data.id)
      }}
      onDragEnd={(e) => {
        if (isResizing) { (e as any).cancelBubble = true; return; }
        onDragEnd && onDragEnd(e as unknown as KonvaEventObject<DragEvent>, data.id)
      }}
    >
      <Rect
        width={width}
        height={height}
        fill={data.fill || '#f8fafc'}
        stroke={isSelected ? '#3b82f6' : '#cbd5e1'}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={12}
        shadowBlur={6}
        shadowColor="rgba(0,0,0,0.1)"
      />
      <Text
        x={12}
        y={8}
        text={title}
        fontSize={14}
        fontStyle="bold"
        fill="#111827"
      />

      {/* 右下角拉伸手柄 */}
      <Rect
        x={(data.width || width) - 10}
        y={(data.height || height) - 10}
        width={12}
        height={12}
        cornerRadius={2}
        fill="#fff"
        stroke="#111827"
        strokeWidth={1}
        draggable
        onMouseDown={(e) => { (e as any).cancelBubble = true; }}
        onTouchStart={(e) => { (e as any).cancelBubble = true; }}
        onDragStart={(e) => {
          (e as any).cancelBubble = true;
          setIsResizing(true);
          const handle: any = e.target;
          const parent = handle.getParent();
          if (parent && typeof parent.draggable === 'function') {
            parent.draggable(false);
          }
          try {
            const parentAbs = parent?.absolutePosition?.() || { x: 0, y: 0 };
            console.log('[Container] resizeStart', { id: data.id, handleLocal: { x: handle?.x?.(), y: handle?.y?.() }, parentAbs, w: data.width || width, h: data.height || height });
          } catch {}
        }}
        dragBoundFunc={function(pos) {
          const node: any = this;
          const parent = node.getParent();
          const parentAbs = parent.absolutePosition();
          const localX = Math.max(80, pos.x - parentAbs.x);
          const localY = Math.max(80, pos.y - parentAbs.y);
          return { x: parentAbs.x + localX, y: parentAbs.y + localY } as any;
        }}
        onDragMove={(e) => {
          const h = e.target as any;
          const localX = h.x();
          const localY = h.y();
          const newW = Math.max(80, localX + 10);
          const newH = Math.max(80, localY + 10);
          try {
            console.log('[Container] resizing', { id: data.id, localX, localY, newW, newH });
          } catch {}
          if (onResize) onResize(data.id, newW, newH);
        }}
        onDragEnd={(e) => {
          const h = e.target as any;
          const localX = h.x();
          const localY = h.y();
          const newW = Math.max(80, localX + 10);
          const newH = Math.max(80, localY + 10);
          if (onResizeEnd) onResizeEnd(data.id, newW, newH);
          const parent = h.getParent();
          if (parent && typeof parent.draggable === 'function') {
            parent.draggable(true);
          }
          setIsResizing(false);
          try {
            console.log('[Container] resizeEnd', { id: data.id, localX, localY, newW, newH });
          } catch {}
        }}
      />
    </Group>
  );
};

export default Container;


