import React from 'react';
import { Circle, Group } from 'react-konva';
import { DEFAULT_CANVAS_SETTINGS } from '../../../constants/canvas';

interface GridBackgroundProps {
  scale: number;
  offsetX: number;
  offsetY: number;
  stageWidth: number;
  stageHeight: number;
}

export const GridBackground: React.FC<GridBackgroundProps> = ({
  scale,
  offsetX,
  offsetY,
  stageWidth,
  stageHeight,
}) => {
  const dots: React.ReactElement[] = [];
  const worldXStart = -offsetX / scale;
  const worldYStart = -offsetY / scale;
  const startX = worldXStart - (worldXStart % DEFAULT_CANVAS_SETTINGS.gridSize);
  const startY = worldYStart - (worldYStart % DEFAULT_CANVAS_SETTINGS.gridSize);

  // 只在缩放级别足够大时显示网格
  if (scale < 0.2) {
    return null;
  }

  for (let i = startX; i < worldXStart + stageWidth / scale; i += DEFAULT_CANVAS_SETTINGS.gridSize) {
    for (let j = startY; j < worldYStart + stageHeight / scale; j += DEFAULT_CANVAS_SETTINGS.gridSize) {
      dots.push(
        <Circle
          key={`dot-${i}-${j}`}
          x={i}
          y={j}
          radius={1 / scale}
          fill={DEFAULT_CANVAS_SETTINGS.gridColor}
          listening={false}
        />
      );
    }
  }

  return <Group listening={false}>{dots}</Group>;
};