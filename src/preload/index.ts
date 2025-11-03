import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  saveProject: (data: string) => {
    console.log('[Preload] saveProject called with data length:', data.length)
    return ipcRenderer.invoke('save-project', data)
  },
  loadProject: () => {
    console.log('[Preload] loadProject called')
    return ipcRenderer.invoke('load-project')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
try {
  // 检查 contextIsolated，如果未定义，默认尝试使用 contextBridge
  const isContextIsolated = typeof process !== 'undefined' && process.contextIsolated !== false
  
  if (isContextIsolated) {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    console.log('[Preload] API exposed via contextBridge')
  } else {
    // @ts-ignore (define in dts)
    ;(window as any).electron = electronAPI
    // @ts-ignore (define in dts)
    ;(window as any).api = api
    console.log('[Preload] API exposed via window object')
  }
  
  // 额外确保 API 可用（双重保险）
  if (typeof window !== 'undefined') {
    // @ts-ignore
    if (!window.api) {
      // @ts-ignore
      window.api = api
      console.log('[Preload] API also set directly on window as fallback')
    }
  }
} catch (error) {
  console.error('[Preload] Error exposing API:', error)
  // 即使出错也尝试直接设置
  try {
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.api = api
      console.log('[Preload] API set on window after error')
    }
  } catch (fallbackError) {
    console.error('[Preload] Fallback also failed:', fallbackError)
  }
}
