import React, { useMemo, useState } from 'react';
import { Rect, Text, Circle, Group } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { ShapeData, ConnectionPoint } from '../../../../types/canvas';

export interface StartProps {
  data: ShapeData;
  isSelected?: boolean;
  isDragging?: boolean;
  onDragEnd?: (e: KonvaEventObject<DragEvent>, id: string) => void;
  onDragMove?: (e: KonvaEventObject<DragEvent>, id: string) => void;
  onResize?: (id: string, width: number, height: number) => void;
  onResizeEnd?: (id: string, width: number, height: number) => void;
  onSelect?: (id: string) => void;
  onConnectionPointClick?: (nodeId: string, pointId: string) => void;
  className?: string;
}

export const Start: React.FC<StartProps> = ({
  data,
  isSelected = false,
  isDragging = false,
  onDragEnd,
  onDragMove,
  onResize,
  onResizeEnd,
  onSelect,
  onConnectionPointClick,
  className,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    if (isResizing) {
      try { (e as any).cancelBubble = true; } catch {}
      return;
    }
    if (onDragEnd) onDragEnd(e, data.id);
  };

  const width = data.width || 200;
  const height = data.height || 100;
  const titleHeight = 30;
  const propHeight = 20;
  const connectionPointRadius = 2;

  const connectionPoints = useMemo((): ConnectionPoint[] => {
    const points: ConnectionPoint[] = [];
    // 允许四边输出连接
    points.push({ id: `${data.id}-top`, type: 'top', x: width / 2, y: 0, isConnected: false });
    points.push({ id: `${data.id}-bottom`, type: 'bottom', x: width / 2, y: height, isConnected: false });
    points.push({ id: `${data.id}-topLeft`, type: 'topLeft', x: 0, y: titleHeight / 2, isConnected: false });
    points.push({ id: `${data.id}-topRight`, type: 'topRight', x: width, y: titleHeight / 2, isConnected: false });
    points.push({ id: `${data.id}-bottomLeft`, type: 'bottomLeft', x: 0, y: height - titleHeight / 2, isConnected: false });
    points.push({ id: `${data.id}-bottomRight`, type: 'bottomRight', x: width, y: height - titleHeight / 2, isConnected: false });
    return points;
  }, [data.id, width, height, titleHeight]);

  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    if (onSelect) onSelect(data.id);
  };

  const handleConnectionPointClick = (pointId: string) => {
    if (onConnectionPointClick) {
      onConnectionPointClick(data.id, pointId);
    }
  };

  const renderOutputProps = () => {
    const outputMode = data.outputMode || (data.outputDataEnabled ? 'custom' : (data.apiUseAsOutput ? 'api' : 'props'));
    if (outputMode !== 'props') return null;
    if (!data.outputProps || data.outputProps.length === 0) return null;
    const headerY = titleHeight + 4;
    const listStartY = titleHeight + propHeight;
    return (
      <>
        <Text x={10} y={headerY} text={"输出"} fontSize={12} fontStyle="bold" fill="#333" listening={false} />
        {data.outputProps.map((prop, index) => (
          <Text key={`output-${index}`} x={10} y={listStartY + index * propHeight} text={prop} fontSize={12} fill="#666" width={width - 20} align="left" listening={false} />
        ))}
      </>
    );
  };

  const renderCustomOutputPreview = () => {
    const outputMode = data.outputMode || (data.outputDataEnabled ? 'custom' : (data.apiUseAsOutput ? 'api' : 'props'));
    if (outputMode === 'props') return null;
    const headerY = titleHeight + 4;
    const label = outputMode === 'api' ? '输出(API)' : '输出(自定义)';
    const preview = data.outputData ? JSON.stringify(data.outputData).slice(0, 50) : '';
    return (
      <>
        <Text x={10} y={headerY} text={label} fontSize={12} fontStyle="bold" fill="#333" listening={false} />
        {preview && (
          <Text x={10} y={headerY + propHeight} text={preview} fontSize={12} fill="#666" width={width - 20} align="left" listening={false} />
        )}
      </>
    );
  };

  const renderConnectionPoints = () => {
    if (!isHovered && !isSelected) return null;
    return connectionPoints.map((point) => (
      <Circle
        key={point.id}
        x={point.x}
        y={point.y}
        radius={connectionPointRadius}
        fill={point.isConnected ? "#ff6b6b" : "#4ecdc4"}
        stroke={isSelected ? "#007AFF" : "#333"}
        strokeWidth={isSelected ? 2 : 1}
        listening={true}
        onClick={() => handleConnectionPointClick(point.id)}
        onTap={() => handleConnectionPointClick(point.id)}
      />
    ));
  };

  return (
    <Group
      x={data.x}
      y={data.y}
      draggable={!isDragging && !isResizing}
      onClick={handleClick}
      onDragMove={(e) => {
        if (isResizing) {
          try { (e as any).cancelBubble = true; } catch {}
          return;
        }
        if (onDragMove) onDragMove(e, data.id);
      }}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={className}
    >
      <Rect
        width={width}
        height={height}
        fill="#ffffff"
        stroke={isSelected ? "#007AFF" : "#d0d0d0"}
        strokeWidth={isSelected ? 2 : 1}
        shadowBlur={isDragging ? 10 : 5}
        shadowColor="rgba(0, 0, 0, 0.1)"
        shadowOffset={{ x: 1, y: 1 }}
        cornerRadius={8}
      />

      <Rect
        width={width}
        height={titleHeight}
        fill="#ffffff"
        stroke="#d0d0d0"
        strokeWidth={1}
        cornerRadius={[8, 8, 0, 0]}
        listening={false}
      />

      <Text
        x={10}
        y={5}
        text={data.title || 'Start'}
        fontSize={14}
        fontStyle="bold"
        fill="#333"
        width={width - 20}
        align="left"
        listening={false}
      />

      {renderOutputProps()}
      {renderCustomOutputPreview()}

      {renderConnectionPoints()}

      <Rect
        x={(data.width || width) - 8}
        y={(data.height || height) - 8}
        width={10}
        height={10}
        cornerRadius={2}
        fill="#ffffff"
        stroke="#111"
        strokeWidth={1}
        draggable
        onMouseDown={(e) => { e.cancelBubble = true; }}
        onTouchStart={(e) => { e.cancelBubble = true; }}
        onDragStart={(e) => {
          e.cancelBubble = true;
          setIsResizing(true);
          const handle: any = e.target;
          const parent = handle.getParent();
          if (parent && typeof parent.draggable === 'function') parent.draggable(false);
        }}
        dragBoundFunc={function(pos) {
          const node: any = this;
          const parent = node.getParent();
          const parentAbs = parent.absolutePosition();
          const localX = Math.max(40, pos.x - parentAbs.x);
          const localY = Math.max(40, pos.y - parentAbs.y);
          return { x: parentAbs.x + localX, y: parentAbs.y + localY } as any;
        }}
        onDragMove={(e) => {
          const handle = e.target as any;
          const localX = handle.x();
          const localY = handle.y();
          const newW = Math.max(40, localX + 8);
          const newH = Math.max(40, localY + 8);
          if (onResize) onResize(data.id, newW, newH);
        }}
        onDragEnd={(e) => {
          const handle = e.target as any;
          const localX = handle.x();
          const localY = handle.y();
          const newW = Math.max(40, localX + 8);
          const newH = Math.max(40, localY + 8);
          if (onResizeEnd) onResizeEnd(data.id, newW, newH);
          const parent = handle.getParent();
          if (parent && typeof parent.draggable === 'function') parent.draggable(true);
          setIsResizing(false);
        }}
      />
    </Group>
  );
};

export default Start;


