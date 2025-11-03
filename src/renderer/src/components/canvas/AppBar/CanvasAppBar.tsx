import React from 'react'
import styles from './CanvasAppBar.module.css'

export interface CanvasAppBarProps {
  onHome: () => void
  onSave: () => void | Promise<void>
  onLoad: () => void | Promise<void>
  onRun: () => void | Promise<void>
}

export default function CanvasAppBar({ onHome, onSave, onLoad, onRun }: CanvasAppBarProps): React.JSX.Element {
  return (
    <div className={styles.container}>
      <button onClick={onHome} title="返回首页" className={styles.btn}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3 7l5-4 5 4v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7z" />
        </svg>
      </button>
      <button onClick={onSave} title="保存项目" className={styles.btn}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5l-3-3z" />
          <path d="M11 2v3h3M9 9H7" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>
      <button onClick={onLoad} title="加载项目" className={styles.btn}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M5 2h6l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M5 2v3h6M8 8v4M6 10l2-2 2 2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>
      <div className={styles.divider} />
      <button onClick={onRun} title="运行" className={styles.btn}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M5 3l8 5-8 5V3z" />
        </svg>
      </button>
    </div>
  )
}


