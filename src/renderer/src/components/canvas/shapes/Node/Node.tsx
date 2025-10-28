import React, { useMemo, useState } from 'react';
import { Rect, Text, Circle, Group } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { ShapeData, ConnectionPoint } from '../../../../types/canvas';

export interface NodeProps {
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

export const Node: React.FC<NodeProps> = ({
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
  void onDragEnd;
  const width = data.width || 200;
  const height = data.height || 120;
  const titleHeight = 30;
  const propHeight = 20;
  const connectionPointRadius = 2; // 更小更简洁

  // 计算连接点位置
  const connectionPoints = useMemo((): ConnectionPoint[] => {
    const points: ConnectionPoint[] = [];
    
    // 四角连接点
    points.push({
      id: `${data.id}-topLeft`,
      type: 'topLeft',
      x: 0,
      y: titleHeight / 2,
      isConnected: false,
    });
    
    points.push({
      id: `${data.id}-topRight`,
      type: 'topRight',
      x: width,
      y: titleHeight / 2,
      isConnected: false,
    });
    
    points.push({
      id: `${data.id}-bottomLeft`,
      type: 'bottomLeft',
      x: 0,
      y: height - titleHeight / 2,
      isConnected: false,
    });
    
    points.push({
      id: `${data.id}-bottomRight`,
      type: 'bottomRight',
      x: width,
      y: height - titleHeight / 2,
      isConnected: false,
    });
    
    // 上下连接点
    points.push({
      id: `${data.id}-top`,
      type: 'top',
      x: width / 2,
      y: 0,
      isConnected: false,
    });
    
    points.push({
      id: `${data.id}-bottom`,
      type: 'bottom',
      x: width / 2,
      y: height,
      isConnected: false,
    });
    
    return points;
  }, [data.id, width, height, titleHeight]);

  

  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    if (onSelect) {
      onSelect(data.id);
    }
  };

  const handleConnectionPointClick = (pointId: string) => {
    if (onConnectionPointClick) {
      onConnectionPointClick(data.id, pointId);
    }
  };

  // 渲染输入属性
  const renderInputProps = () => {
    if (!data.inputProps || data.inputProps.length === 0) return null;
    
    return data.inputProps.map((prop, index) => (
      <Text
        key={`input-${index}`}
        x={10}
        y={titleHeight + index * propHeight}
        text={prop}
        fontSize={12}
        fill="#666"
        width={width - 20}
        align="left"
        listening={false}
      />
    ));
  };

  // 渲染输出属性
  const renderOutputProps = () => {
    if (!data.outputProps || data.outputProps.length === 0) return null;
    
    return data.outputProps.map((prop, index) => (
      <Text
        key={`output-${index}`}
        x={10}
        y={titleHeight + (data.inputProps?.length || 0) * propHeight + index * propHeight}
        text={prop}
        fontSize={12}
        fill="#666"
        width={width - 20}
        align="left"
        listening={false}
      />
    ));
  };

  // 渲染连接点（只在悬停时显示）
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
      draggable={false}
      onClick={handleClick}
      onDragMove={(e) => {
        if (isResizing) {
          try { (e as any).cancelBubble = true; } catch {}
          return;
        }
        try {
          const t: any = e.target;
          console.log('[Node] dragMove', { id: data.id, x: t?.x?.(), y: t?.y?.(), isResizing });
        } catch {}
        if (onDragMove) onDragMove(e, data.id);
      }}
      onDragEnd={undefined as unknown as any}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={className}
    >
      {/* 主矩形 - 统一白色背景 */}
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
      
      {/* 标题栏 - 白色背景，浅色边框 */}
      <Rect
        width={width}
        height={titleHeight}
        fill="#ffffff"
        stroke="#d0d0d0"
        strokeWidth={1}
        cornerRadius={[8, 8, 0, 0]}
        listening={false}
      />
      
      {/* 标题文本 */}
      <Text
        x={10}
        y={5}
        text={data.title || "Node"}
        fontSize={14}
        fontStyle="bold"
        fill="#333"
        width={width - 20}
        align="left"
        listening={false}
      />
      
      {/* 输入属性 */}
      {renderInputProps()}
      
      {/* 输出属性 */}
      {renderOutputProps()}
      
      {/* 连接点 */}
      {renderConnectionPoints()}

      {/* 右下角拉伸手柄 */}
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
          if (parent && typeof parent.draggable === 'function') {
            parent.draggable(false);
          }
          try {
            const parentAbs = parent?.absolutePosition?.() || { x: 0, y: 0 };
            console.log('[Node] resizeStart', { id: data.id, handleLocal: { x: handle?.x?.(), y: handle?.y?.() }, parentAbs, w: data.width || width, h: data.height || height });
          } catch {}
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
          try {
            console.log('[Node] resizing', { id: data.id, localX, localY, newW, newH });
          } catch {}
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
          if (parent && typeof parent.draggable === 'function') {
            parent.draggable(true);
          }
          setIsResizing(false);
          try {
            console.log('[Node] resizeEnd', { id: data.id, localX, localY, newW, newH });
          } catch {}
        }}
      />
    </Group>
  );
}

export default Node;