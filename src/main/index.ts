import { app, shell, BrowserWindow, ipcMain,dialog} from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'



import path from 'path'
import fs from 'fs'
//保存加载方面逻辑-----------------------------------------------------------------------------------------
// --- 變數定義 ---
// 將檔案路徑相關的變數移到頂部，方便管理
let settingsFilePath: string;//固定值，该路径的文件是用来存储上次关闭应用时所打开的文件的位置
let defaultDataFilePath: string;//第一次打开或者没有保存文件时的默认路径文件
let currentDataFilePath: string; // 用來追蹤當前正在操作的檔案路徑



// Settings 介面定義
interface AppSettings {
  lastOpenedFilePath?: string;
}

// 讀取設定的輔助函式
function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const settingsJson = fs.readFileSync(settingsFilePath, 'utf-8');
      return JSON.parse(settingsJson);
    }
  } catch (error) {
    console.error('讀取設定檔失敗:', error);
  }
  return {}; // 如果檔案不存在或出錯，回傳空物件
}
/*
// 儲存設定的輔助函式//以后有打开功能用得到
function saveSettings(settings: AppSettings) {
  try {
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('儲存設定檔失敗:', error);
  }
}
*/
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
//保存加载方面逻辑-----------------------------------------------------------------------------------------

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






// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')
//保存加载方面逻辑-----------------------------------------------------------------------------------------
// --- 關鍵修改 1: 初始化所有路徑 ---
  const userDataPath = app.getPath('userData');
// 設定檔的路徑
  settingsFilePath = path.join(userDataPath, 'settings.json');
// 預設畫布數據檔案的路徑
  defaultDataFilePath = path.join(userDataPath, 'canvas-data.json');
// 決定本次啟動要載入哪個檔案
  const settings = loadSettings();
// 如果設定檔中有上次的路徑，就用它；否則，使用預設路徑
  currentDataFilePath = settings.lastOpenedFilePath || defaultDataFilePath;

  console.log('初始路径', currentDataFilePath);

//ctrl+s保存api
  ipcMain.handle('save-data', (_event, data) => {
    try {
      // 總是儲存到當前追蹤的路徑
      const jsonString = JSON.stringify(data, null, 2);
      fs.writeFileSync(currentDataFilePath, jsonString, 'utf-8');
      return { success: true };
    } catch (error) {
      console.error(`儲存數據至 ${currentDataFilePath} 失敗:`, error);
      return { success: false, error: true };
    }
  });
//加载数据api
  ipcMain.handle('load-data', async () => {
    try {
      // 直接從當前追蹤的路徑讀取
      if (fs.existsSync(currentDataFilePath)) {
        const jsonString = fs.readFileSync(currentDataFilePath, 'utf-8');
        return JSON.parse(jsonString);
      }
      return null;
    } catch (error) {
      console.error(`從 ${currentDataFilePath} 讀取數據失敗:`, error);
      return null;
    }
  });
//另存为api
  ipcMain.handle('save-data-as', async (_event, data) => {
    const mainWindow = BrowserWindow.getFocusedWindow();
    if (!mainWindow) return { success: false, error: '無法獲取主視窗' };

    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: '將畫布另存為',
        defaultPath: path.basename(currentDataFilePath) || '我的畫布.json', // 預設檔名使用目前檔名
        filters: [
          { name: 'JSON 檔案', extensions: ['json'] },
          { name: '所有檔案', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }

      const newFilePath = result.filePath;
      const jsonString = JSON.stringify(data, null, 2);
      fs.writeFileSync(newFilePath, jsonString, 'utf-8');

      // --- 關鍵修改 3: 成功另存為後，更新當前路徑並儲存設定 ---
      /*
      currentDataFilePath = newFilePath;
      const currentSettings = loadSettings();
      currentSettings.lastOpenedFilePath = newFilePath;
      saveSettings(currentSettings);

      console.log('檔案已另存為，新的預設路徑是:', newFilePath);
      */
      return { success: true, path: newFilePath };

    } catch (error) {
      console.error('另存為失敗:', error);
      return { success: false, error: true };
    }
  });
//保存加载方面逻辑-----------------------------------------------------------------------------------------
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
