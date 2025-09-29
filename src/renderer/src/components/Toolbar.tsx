import React from 'react';

// 定义允许创建的图形类型
export type ShapeType = 'rectangle' | 'circle' | 'arrow'; // 添加 'arrow'

interface ToolbarProps {
  selectedShape: ShapeType | null;
  onSelectShape: (shape: ShapeType) => void;
}

// --- 样式代码 (无变化) ---
const toolbarStyle: React.CSSProperties = { /* ... */ };
const buttonStyle: React.CSSProperties = { /* ... */ };
const selectedButtonStyle: React.CSSProperties = { /* ... */ };

export const Toolbar: React.FC<ToolbarProps> = ({ selectedShape, onSelectShape }) => {
  return (
    <div style={toolbarStyle}>
      <button
        style={selectedShape === 'rectangle' ? selectedButtonStyle : buttonStyle}
        onClick={() => onSelectShape('rectangle')}
      >
        矩形
      </button>
      <button
        style={selectedShape === 'circle' ? selectedButtonStyle : buttonStyle}
        onClick={() => onSelectShape('circle')}
      >
        圆形
      </button>
      {/* 新增箭头按钮 */}
      <button
        style={selectedShape === 'arrow' ? selectedButtonStyle : buttonStyle}
        onClick={() => onSelectShape('arrow')}
      >
        箭头
      </button>
    </div>
  );
};