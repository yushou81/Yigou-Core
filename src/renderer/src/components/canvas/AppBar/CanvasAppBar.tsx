import React from 'react'
import { HomeIcon, SaveIcon, FolderOpenIcon, PlayIcon } from './Icons'
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
        <HomeIcon width={16} height={16} />
      </button>
      <button onClick={onSave} title="保存项目" className={styles.btn}>
        <SaveIcon width={16} height={16} />
      </button>
      <button onClick={onLoad} title="加载项目" className={styles.btn}>
        <FolderOpenIcon width={16} height={16} />
      </button>
      <div className={styles.divider} />
      <button onClick={onRun} title="运行" className={styles.btn}>
        <PlayIcon width={16} height={16} />
      </button>
    </div>
  )
}


