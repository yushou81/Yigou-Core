import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  saveData: (data) => ipcRenderer.invoke('save-data', data), // ...它實際上會透過 ipcRenderer.invoke 向主進程發送一個名為 'save-data' 的訊息，並附上數據。

  // 我們定義一個 loadData 函式。
  // 當 React 呼叫 window.electronAPI.loadData() 時...
  loadData: () => ipcRenderer.invoke('load-data') // ...它會向主進程發送一個名為 'load-data' 的訊息。
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
