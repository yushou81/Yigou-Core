import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'



import path from 'path'
import fs from 'fs'
let dataFilePath

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, 'dist', '../renderer/index.html'))
  }
}


const userDataPath = app.getPath('userData');
// eslint-disable-next-line prefer-const
dataFilePath = path.join(userDataPath, 'canvas-data.json');
console.log('數據將儲存至:', dataFilePath);
ipcMain.handle('save-data', (_event, data) => {
  try {
    // 將從 React 組件傳來的 JavaScript 物件轉換為格式化的 JSON 字串。
    const jsonString = JSON.stringify(data, null, 2); // null, 2 讓 JSON 格式更易讀
    // 使用 Node.js 的 fs 模組，同步地將字串寫入我們之前定義好的檔案路徑。
    fs.writeFileSync(dataFilePath, jsonString, 'utf-8');
    // 操作成功，回傳一個成功的標記。
    return { success: true };
  } catch (error) {
    // 如果寫入過程出錯，在主進程的終端機中印出錯誤，並回傳失敗訊息。
    console.error('儲存數據失敗:', error);
    return { error: true, success: false }
  }
});

// 2. 處理 'load-data' 請求
ipcMain.handle('load-data', async () => {
  try {
    console.log('load-data')
    // 檢查檔案是否存在。
    if (fs.existsSync(dataFilePath)) {
      // 如果存在，則同步讀取檔案內容 (會是一個 JSON 字串)。
      const jsonString = fs.readFileSync(dataFilePath, 'utf-8');
      // 將讀取到的 JSON 字串解析成 JavaScript 物件並回傳給渲染進程。
      return JSON.parse(jsonString);
    }
    // 如果檔案不存在 (例如第一次開啟應用)，回傳 null。
    // 這樣前端就可以根據 null 來決定是否使用初始數據。
    return null;
  } catch (error) {
    // 如果讀取或解析過程中出錯，印出錯誤並回傳 null。
    console.error('讀取數據失敗:', error);
    return null;
  }
});



// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
