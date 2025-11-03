/// <reference types="vite/client" />

declare global {
  interface Window {
    api?: {
      saveProject: (data: string) => Promise<{ success: boolean; filePath?: string; message?: string }>
      loadProject: () => Promise<{ success: boolean; data?: string; filePath?: string; message?: string }>
    }
  }
}

export {}
