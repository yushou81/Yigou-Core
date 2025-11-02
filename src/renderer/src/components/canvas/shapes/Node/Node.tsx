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

  // 获取输入数据（与验证逻辑一致）
  const getInputData = (): Record<string, any> => {
    const mode = data.inputMode || (data.inputDataEnabled ? 'custom' : 'props');
    if (mode === 'props') {
      const props = (data.inputProps || []).filter((k: string) => !!k);
      const inputData: Record<string, any> = {};
      props.forEach((prop: string) => {
        if (data.inputData && data.inputData[prop] !== undefined) {
          inputData[prop] = data.inputData[prop];
        }
      });
      return inputData;
    }
    return data.inputData && typeof data.inputData === 'object' && !Array.isArray(data.inputData) ? data.inputData : {};
  };

  // 获取输出数据（与验证逻辑一致）
  const getOutputData = (): Record<string, any> => {
    const mode = data.outputMode || (data.outputDataEnabled ? 'custom' : (data.apiUseAsOutput ? 'api' : 'props'));
    if (mode === 'props') {
      const props = (data.outputProps || []).filter((k: string) => !!k);
      const outputData: Record<string, any> = {};
      props.forEach((prop: string) => {
        if (data.outputData && data.outputData[prop] !== undefined) {
          outputData[prop] = data.outputData[prop];
        }
      });
      return outputData;
    }
    if (mode === 'api') {
      const apiResult = data.outputData?.apiResult;
      if (apiResult) {
        return parseApiResult(apiResult);
      }
      return {};
    }
    return data.outputData && typeof data.outputData === 'object' && !Array.isArray(data.outputData) ? data.outputData : {};
  };

  // 格式化值的显示
  const formatValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') {
      try {
        const str = JSON.stringify(value);
        return str.length > 20 ? str.slice(0, 20) + '...' : str;
      } catch {
        return '[Object]';
      }
    }
    return String(value);
  };

  // 渲染输入属性（显示实际数据）
  const renderInputProps = () => {
    const inputMode = data.inputMode || (data.inputDataEnabled ? 'custom' : 'props');
    if (inputMode === 'custom') {
      // Custom 模式：显示 JSON
      const inputData = getInputData();
      if (!inputData || Object.keys(inputData).length === 0) return null;
      const headerY = titleHeight + 4;
      const jsonStr = JSON.stringify(inputData, null, 2);
      const lines = jsonStr.split('\n').slice(0, 5); // 最多显示5行
      return (
        <>
          <Text x={10} y={headerY} text={"输入(自定义)"} fontSize={12} fontStyle="bold" fill="#333" listening={false} />
          {lines.map((line, index) => (
            <Text
              key={`input-custom-${index}`}
              x={10}
              y={headerY + propHeight + index * propHeight}
              text={line.length > 30 ? line.slice(0, 30) + '...' : line}
              fontSize={11}
              fill="#666"
              width={width - 20}
              align="left"
              listening={false}
            />
          ))}
        </>
      );
    }
    // Props 模式：显示 属性名: 值
    if (!data.inputProps || data.inputProps.length === 0) return null;
    const inputData = getInputData();
    const headerY = titleHeight + 4;
    const listStartY = titleHeight + propHeight;
    return (
      <>
        <Text x={10} y={headerY} text={"输入"} fontSize={12} fontStyle="bold" fill="#333" listening={false} />
        {data.inputProps.map((prop, index) => {
          const value = inputData[prop];
          const displayText = value !== undefined ? `${prop}: ${formatValue(value)}` : prop;
          return (
            <Text
              key={`input-${index}`}
              x={10}
              y={listStartY + index * propHeight}
              text={displayText}
              fontSize={11}
              fill={value !== undefined ? "#333" : "#999"}
              width={width - 20}
              align="left"
              listening={false}
            />
          );
        })}
      </>
    );
  };

  // 渲染输出属性（显示实际数据）
  const renderOutputProps = () => {
    const outputMode = data.outputMode || (data.outputDataEnabled ? 'custom' : (data.apiUseAsOutput ? 'api' : 'props'));
    const inputMode = data.inputMode || (data.inputDataEnabled ? 'custom' : 'props');
    
    // 计算基础 Y 位置
    const inputHeight = (() => {
      if (inputMode === 'custom') {
        const inputData = getInputData();
        return inputData && Object.keys(inputData).length > 0 ? 6 * propHeight : 0;
      }
      return (data.inputProps && data.inputProps.length > 0) ? (data.inputProps.length + 1) * propHeight : 0;
    })();
    const baseY = titleHeight + inputHeight;
    
    if (outputMode === 'props') {
      // Props 模式：显示 属性名: 值
      if (!data.outputProps || data.outputProps.length === 0) return null;
      const outputData = getOutputData();
      const headerY = baseY + 4;
      const listStartY = baseY + propHeight;
      return (
        <>
          <Text x={10} y={headerY} text={"输出"} fontSize={12} fontStyle="bold" fill="#333" listening={false} />
          {data.outputProps.map((prop, index) => {
            const value = outputData[prop];
            const displayText = value !== undefined ? `${prop}: ${formatValue(value)}` : prop;
            return (
              <Text
                key={`output-${index}`}
                x={10}
                y={listStartY + index * propHeight}
                text={displayText}
                fontSize={11}
                fill={value !== undefined ? "#333" : "#999"}
                width={width - 20}
                align="left"
                listening={false}
              />
            );
          })}
        </>
      );
    }
    
    // Custom 或 API 模式：显示 JSON
    const outputData = getOutputData();
    if (!outputData || Object.keys(outputData).length === 0) return null;
    const headerY = baseY + 4;
    const label = outputMode === 'api' ? '输出(API)' : '输出(自定义)';
    const jsonStr = JSON.stringify(outputData, null, 2);
    const lines = jsonStr.split('\n').slice(0, 5); // 最多显示5行
    return (
      <>
        <Text x={10} y={headerY} text={label} fontSize={12} fontStyle="bold" fill="#333" listening={false} />
        {lines.map((line, index) => (
          <Text
            key={`output-custom-${index}`}
            x={10}
            y={headerY + propHeight + index * propHeight}
            text={line.length > 30 ? line.slice(0, 30) + '...' : line}
            fontSize={11}
            fill="#666"
            width={width - 20}
            align="left"
            listening={false}
          />
        ))}
      </>
    );
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