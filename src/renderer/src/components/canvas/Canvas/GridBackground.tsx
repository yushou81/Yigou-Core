// ================================
// GridBackground：网格背景渲染
//
// 说明：
// - 使用 SVG pattern 填充，实现与相机平移/缩放同步
// - 叠加在 Stage 之上（pointer-events: none）
// ================================
import React, { useMemo } from 'react';
import { DEFAULT_CANVAS_SETTINGS } from '../../../constants/canvas';
import styles from './Canvas.module.css';

interface GridBackgroundProps {
  scale: number; // 缩放比例
  offsetX: number; // 相机在屏幕上的 X 偏移量
  offsetY: number; // 相机在屏幕上的 Y 偏移量
  stageWidth: number; // 画布宽度
  stageHeight: number; // 画布高度
}

const mod = (value: number, divisor: number) => {
  if (divisor === 0) return 0;
  const remainder = value % divisor;
  return remainder < 0 ? remainder + divisor : remainder;
};

const MIN_TILE_PX = 6;

const computeLod = (baseTileSize: number) => {
  if (baseTileSize >= MIN_TILE_PX) return 1;
  const pow = Math.ceil(Math.log2(MIN_TILE_PX / baseTileSize));
  return 2 ** pow;
};

const clampRadius = (scale: number, gridSize: number, tileSize: number) => {
  const normalizedScale = Math.max(scale, 0.1);
  const worldRadius = Math.min(
    gridSize / 2 - 0.1,
    Math.max(1 / normalizedScale, 0.05)
  );
  const screenRadius = worldRadius * scale * 1.5;
  return Math.min(Math.max(screenRadius, 0.6), tileSize / 4);
};

export const GridBackground: React.FC<GridBackgroundProps> = ({
  scale,
  offsetX,
  offsetY,
  stageWidth,
  stageHeight,
}) => {
  const patternId = useMemo(
    () => `gridTile-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  const gridSize = DEFAULT_CANVAS_SETTINGS.gridSize;
  const baseTileSize = gridSize * scale;
  const lod = computeLod(baseTileSize || 1);
  const effectiveGridSize = gridSize * lod;
  const tileSize = Math.max(effectiveGridSize * scale, MIN_TILE_PX);
  const translateX = mod(offsetX, tileSize);
  const translateY = mod(offsetY, tileSize);
  const radius = clampRadius(scale, gridSize, tileSize);

  return (
    <svg
      className={styles.gridOverlay}
      width={stageWidth}
      height={stageHeight}
      aria-hidden
    >
      <defs>
        <pattern
          id={patternId}
          patternUnits="userSpaceOnUse"
          width={tileSize}
          height={tileSize}
          patternTransform={`translate(${translateX} ${translateY})`}
        >
          <circle
            cx={0}
            cy={0}
            r={radius}
          fill={DEFAULT_CANVAS_SETTINGS.gridColor}
        />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
      );
};