import React, { useMemo, useRef, useState } from 'react';
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
  const initialPosRef = useRef<{ x: number; y: number }>({ x: data.x || 0, y: data.y || 0 });
  
  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    if (isResizing) {
      try { (e as any).cancelBubble = true; } catch {}
      return;
    }
    try {
      const target: any = e.target;
      console.log('[Node] dragEnd', { id: data.id, finalX: target?.x?.(), finalY: target?.y?.() });
    } catch {}
    if (onDragEnd) {
      onDragEnd(e, data.id);
    }
  };
  const width = data.width || 200;
  const height = data.height || 120;
  const titleHeight = 30;
  // const propHeight = 20; // 已不再使用输入/输出渲染
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

  // 解析 API 返回结果（与验证逻辑一致）
  const parseApiResult = (apiResult: any): Record<string, any> => {
    if (!apiResult) return {};
    if (typeof apiResult === 'object' && !Array.isArray(apiResult)) {
      return apiResult;
    }
    if (Array.isArray(apiResult)) {
      return apiResult.length > 0 ? { ...apiResult[0], _array: apiResult } : {};
    }
    if (typeof apiResult === 'string') {
      try {
        const parsed = JSON.parse(apiResult);
        return parseApiResult(parsed);
      } catch {
        return { value: apiResult };
      }
    }
    return { value: apiResult };
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
      draggable={!isDragging && !isResizing}
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
      onDragEnd={handleDragEnd}
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
      
      {/* 描述内容（仅显示描述，不再渲染输入/输出）*/}
      {data.description && (
        <Text
          x={10}
          y={titleHeight + 6}
          text={String(data.description)}
          fontSize={12}
          fill="#444"
          width={width - 20}
          align="left"
          listening={false}
        />
      )}
      
      {/* 连接点 */}
      {renderConnectionPoints()}

      {/* 右下角拉伸手柄 - 只在悬停或选中时显示 */}
      {(isHovered || isSelected) && (
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
          // 记录开始调整大小时节点的初始位置，避免之后被意外改动
          try {
            const group = parent as any;
            initialPosRef.current = { x: group?.x?.() || data.x || 0, y: group?.y?.() || data.y || 0 };
          } catch {}
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
          // 强制恢复节点原始位置，只更新宽高，避免发生移位
          try {
            const { x, y } = initialPosRef.current;
            const group = (handle.getParent && handle.getParent()) as any;
            if (group && typeof group.position === 'function') {
              group.position({ x, y });
            }
          } catch {}
          const parent = handle.getParent();
          if (parent && typeof parent.draggable === 'function') {
            parent.draggable(true);
          }
          // 阻止冒泡，避免 Group 在本次事件循环内触发 dragEnd 导致节点位置被错误设置
          try { (e as any).cancelBubble = true; } catch {}
          // 下一 tick 再结束 isResizing，确保 Group 的 onDragEnd 看到的是 isResizing=true
          setTimeout(() => setIsResizing(false), 0);
          try {
            console.log('[Node] resizeEnd', { id: data.id, localX, localY, newW, newH });
          } catch {}
        }}
        />
      )}
    </Group>
  );
}

export default Node;