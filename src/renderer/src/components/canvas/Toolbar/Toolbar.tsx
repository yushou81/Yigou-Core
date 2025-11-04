import React from 'react';
import { ShapeType } from '../../../types/canvas';
import styles from './Toolbar.module.css';

export interface ToolbarProps {
  onDragStart?: (shapeType: ShapeType, event: React.DragEvent) => void;
  className?: string;
}

interface ToolbarButtonProps {
  shapeType: ShapeType;
  label: string;
  icon?: React.ReactNode;
  onDragStart?: (shapeType: ShapeType, event: React.DragEvent) => void;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  shapeType,
  label,
  icon,
  onDragStart,
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(shapeType, e);
    }
  };

  return (
    <button
      className={styles.toolbarButton}
      onDragStart={handleDragStart}
      draggable={true}
      aria-label={`拖拽${label}到画布创建`}
      data-shape-type={shapeType}
      data-label={label}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
    </button>
  );
};

export const Toolbar: React.FC<ToolbarProps> = ({
  onDragStart,
  className,
}) => {
  const tools: Array<{
    type: ShapeType;
    label: string;
    icon?: React.ReactNode;
  }> = [
    {
      type: 'start',
      label: '起点',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="4" cy="8" r="2" />
          <rect x="6" y="3" width="8" height="10" rx="2" />
        </svg>
      ),
    },
    {
      type: 'container',
      label: '容器',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="1.5" y="3" width="13" height="10" rx="2" stroke="currentColor" fill="none" />
          <rect x="3" y="5" width="9" height="6" rx="1.5" fill="currentColor" opacity="0.15" />
        </svg>
      ),
    },
    {
      type: 'node',
      label: '节点',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="2" y="2" width="12" height="12" rx="2" />
          <circle cx="4" cy="4" r="1" fill="currentColor" />
          <circle cx="12" cy="4" r="1" fill="currentColor" />
          <circle cx="4" cy="12" r="1" fill="currentColor" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
        </svg>
      ),
    },
    {
      type: 'arrow',
      label: '箭头',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 8h12M10 4l4 4-4 4" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      ),
    },
  ];

  return (
    <div className={`${styles.toolbar} ${className || ''}`}>
      <div className={styles.toolGroup}>
        <div className={styles.toolButtons}>
          {tools.map((tool) => (
            <ToolbarButton
              key={tool.type}
              shapeType={tool.type}
              label={tool.label}
              icon={tool.icon}
              onDragStart={onDragStart}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
