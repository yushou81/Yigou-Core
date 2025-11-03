import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      saveProject: (data: string) => Promise<{ success: boolean; filePath?: string; message?: string }>
      loadProject: () => Promise<{ success: boolean; data?: string; filePath?: string; message?: string }>
      saveProjectToPath: (path: string, data: string) => Promise<{ success: boolean; filePath?: string; message?: string }>
      loadProjectFromPath: (path: string) => Promise<{ success: boolean; data?: string; filePath?: string; message?: string }>
    }
  }
}
