import React from 'react'
import { HomeIcon, SaveIcon, FolderOpenIcon, PlayIcon } from './Icons'
import styles from './CanvasAppBar.module.css'

export interface CanvasAppBarProps {
  onHome: () => void
  onSave: () => void | Promise<void>
  onLoad: () => void | Promise<void>
  onRun: () => void | Promise<void>
  onPrev?: () => void | Promise<void>
  onNext?: () => void | Promise<void>
}

export default function CanvasAppBar({ onHome, onSave, onLoad, onRun, onPrev, onNext }: CanvasAppBarProps): React.JSX.Element {
  return (
    <div className={styles.container}>
      <button onClick={onHome} title="返回首页" className={styles.btn}>
        <HomeIcon width={16} height={16} />
      </button>
      <button onClick={onSave} title="保存项目" className={styles.btn}>
        <SaveIcon width={16} height={16} />
      </button>
      <button onClick={onLoad} title="加载项目" className={styles.btn}>
        <FolderOpenIcon width={16} height={16} />
      </button>
      {onPrev && (
        <button onClick={onPrev} title="上一个箭头" className={styles.btn}>
          <svg viewBox="0 0 512 512" width={16} height={16} fill="currentColor" style={{ transform: 'scaleX(-1)' }}>
            <path d="M502.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L402.7 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l370.7 0-105.4 105.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z" />
          </svg>
        </button>
      )}
      {onNext && (
        <button onClick={onNext} title="下一个箭头" className={styles.btn}>
          <svg viewBox="0 0 512 512" width={16} height={16} fill="currentColor">
            <path d="M502.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L402.7 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l370.7 0-105.4 105.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z" />
          </svg>
        </button>
      )}
      <div className={styles.divider} />
      <button onClick={onRun} title="运行" className={styles.btn}>
        <PlayIcon width={16} height={16} />
      </button>
    </div>
  )
}


