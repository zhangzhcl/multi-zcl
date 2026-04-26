const { app, BrowserWindow, ipcMain, shell, Menu, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { setupChatHandlers } = require('./chat')

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  const iconPath = path.join(__dirname, '../build/icon.png')
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: process.platform !== 'darwin',
    title: 'Multi-ZCL',
  })

  // 外部链接用系统默认浏览器打开
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  setupChatHandlers()
  buildMenu()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

function buildMenu() {
  const isMac = process.platform === 'darwin'
  const template = [
    ...(isMac ? [{ label: app.name, submenu: [
      {
        label: '关于 Multi-ZCL',
        click: () => {
          dialog.showMessageBox({
            type: 'none',
            icon: path.join(__dirname, '../build/icon.png'),
            title: 'Multi-ZCL',
            message: 'Multi-ZCL',
            detail: 'multi-zcl\n\n一款轻量化 Claude 多配置隔离切换工具\n支持多终端独立环境、多账号/多代理并行隔离\n告别配置冲突，一键快速切换\n\n作者：ZCL（技术支持·自研工具）',
            buttons: ['确定'],
          })
        },
      },
      { type: 'separator' },
      { label: '服务', role: 'services' },
      { type: 'separator' },
      { label: '隐藏 Multi-ZCL', role: 'hide' },
      { label: '隐藏其他', role: 'hideOthers' },
      { label: '全部显示', role: 'unhide' },
      { type: 'separator' },
      { label: '退出', role: 'quit' },
    ]}] : []),
    {
      label: '文件',
      submenu: [
        {
          label: '新建对话',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            const win = BrowserWindow.getAllWindows()[0]
            if (win) win.webContents.send('menu:new-session')
          },
        },
        { type: 'separator' },
        {
          label: '导入附件…',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            const win = BrowserWindow.getAllWindows()[0]
            if (win) win.webContents.send('menu:pick-file')
          },
        },
        { type: 'separator' },
        {
          label: '关于 Multi-ZCL',
          click: () => {
            dialog.showMessageBox({
              type: 'none',
              icon: path.join(__dirname, '../build/icon.png'),
              title: 'Multi-ZCL',
              message: 'Multi-ZCL',
              detail: 'multi-zcl\n\n一款轻量化 Claude 多配置隔离切换工具\n支持多终端独立环境、多账号/多代理并行隔离\n告别配置冲突，一键快速切换\n\n作者：ZCL（技术支持·自研工具）',
              buttons: ['确定'],
            })
          },
        },
        { type: 'separator' },
        isMac ? { label: '关闭窗口', role: 'close' } : { label: '退出', role: 'quit' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' },
        { label: '全选', role: 'selectAll' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', role: 'reload' },
        { label: '强制重新加载', role: 'forceReload' },
        { label: '开发者工具', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', role: 'resetZoom' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
        { type: 'separator' },
        { label: '全屏', role: 'togglefullscreen' },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', role: 'minimize' },
        { label: '缩放', role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { label: '置于最前', role: 'front' },
        ] : [
          { label: '关闭', role: 'close' },
        ]),
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── Provider 存储路径 ───────────────────────────────────────────────────────
const STORE_DIR = path.join(os.homedir(), '.cc-gateway')
const STORE_FILE = path.join(STORE_DIR, 'providers.json')

function ensureStore() {
  if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true })
  if (!fs.existsSync(STORE_FILE)) fs.writeFileSync(STORE_FILE, JSON.stringify({ providers: [], activeId: null }))
}

function readStore() {
  ensureStore()
  return JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'))
}

function writeStore(data) {
  ensureStore()
  const tmp = STORE_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, STORE_FILE)
}

// ─── ~/.claude/settings.json 路径 ────────────────────────────────────────────
function getClaudeSettingsPath() {
  return path.join(os.homedir(), '.claude', 'settings.json')
}

function readClaudeSettings() {
  const p = getClaudeSettingsPath()
  if (!fs.existsSync(p)) return {}
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')) } catch { return {} }
}

function writeClaudeSettings(settings) {
  const dir = path.join(os.homedir(), '.claude')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const p = getClaudeSettingsPath()
  const tmp = p + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(settings, null, 2))
  fs.renameSync(tmp, p)
}

// ─── 代理设置 ────────────────────────────────────────────────────────────────
let globalProxy = readStore().proxy || ''

ipcMain.handle('proxy:get', () => globalProxy)
ipcMain.handle('proxy:set', (_, proxyUrl) => {
  globalProxy = proxyUrl || ''
  const store = readStore()
  store.proxy = globalProxy
  writeStore(store)
  return globalProxy
})

// 供 chat.js 读取
function getProxy() { return globalProxy }

module.exports = { getProxy }

// ─── IPC handlers ────────────────────────────────────────────────────────────
ipcMain.handle('providers:list', () => readStore())

ipcMain.handle('providers:save', (_, provider) => {
  const store = readStore()
  const idx = store.providers.findIndex(p => p.id === provider.id)
  if (idx >= 0) store.providers[idx] = provider
  else store.providers.push(provider)
  writeStore(store)
  return store
})

ipcMain.handle('providers:delete', (_, id) => {
  const store = readStore()
  store.providers = store.providers.filter(p => p.id !== id)
  if (store.activeId === id) {
    store.activeId = null
  }
  writeStore(store)
  return store
})

ipcMain.handle('providers:activate', (_, id) => {
  const store = readStore()
  const provider = store.providers.find(p => p.id === id)
  if (!provider) throw new Error('Provider not found')

  store.activeId = id
  writeStore(store)

  // 把 envVars 整块写入 ~/.claude/settings.json 的 env 字段
  const settings = readClaudeSettings()
  settings.env = { ...(provider.envVars || {}) }
  writeClaudeSettings(settings)

  return store
})

ipcMain.handle('providers:deactivate', () => {
  const store = readStore()
  store.activeId = null
  writeStore(store)

  const settings = readClaudeSettings()
  delete settings.env
  writeClaudeSettings(settings)

  return store
})

ipcMain.handle('claude-settings:read', () => readClaudeSettings())

ipcMain.handle('file:fromPath', (_, filePath) => {
  const data = fs.readFileSync(filePath)
  const ext = path.extname(filePath).toLowerCase().slice(1)
  const name = path.basename(filePath)
  const isImage = ['png','jpg','jpeg','gif','webp','bmp'].includes(ext)
  const isText = ['txt','md','csv','json','xml','html','js','ts','jsx','tsx','py','java','c','cpp','go','rs','sql','bat','cmd','sh','bash','zsh','ps1','rb','php','swift','kt','kts','scala','lua','pl','r','yaml','yml','toml','ini','cfg','conf','env','log','diff','patch','gitignore','dockerfile'].includes(ext)
  return {
    name, ext, path: filePath, isImage, isText,
    base64: isImage ? data.toString('base64') : null,
    text: isText ? data.toString('utf-8') : null,
    size: data.length,
  }
})

ipcMain.handle('file:fromBuffer', (_, name, ext, buffer) => {
  const isImage = ['png','jpg','jpeg','gif','webp','bmp'].includes(ext)
  const isText = ['txt','md','csv','json','xml','html','js','ts','jsx','tsx','py','java','c','cpp','go','rs','sql','bat','cmd','sh','bash','zsh','ps1','rb','php','swift','kt','kts','scala','lua','pl','r','yaml','yml','toml','ini','cfg','conf','env','log','diff','patch','gitignore','dockerfile'].includes(ext)
  const buf = Buffer.from(buffer)
  return {
    name, ext, path: null, isImage, isText,
    base64: isImage ? buf.toString('base64') : null,
    text: isText ? buf.toString('utf-8') : null,
    size: buf.length,
  }
})

ipcMain.handle('file:pick', async () => {
  const win = BrowserWindow.getAllWindows()[0]
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '所有支持的文件', extensions: ['png','jpg','jpeg','gif','webp','bmp','mp4','mov','avi','mkv','webm','txt','md','csv','json','xml','html','js','ts','jsx','tsx','py','java','c','cpp','go','rs','xlsx','xls','docx','doc','pptx','ppt','pdf'] },
      { name: '图片', extensions: ['png','jpg','jpeg','gif','webp','bmp'] },
      { name: '视频', extensions: ['mp4','mov','avi','mkv','webm'] },
      { name: '文档', extensions: ['txt','md','csv','json','xml','html','pdf'] },
      { name: 'Office 文件', extensions: ['xlsx','xls','docx','doc','pptx','ppt'] },
      { name: '代码文件', extensions: ['js','ts','jsx','tsx','py','java','c','cpp','go','rs'] },
      { name: '所有文件', extensions: ['*'] },
    ],
  })
  if (result.canceled) return []
  return result.filePaths.map(fp => {
    const data = fs.readFileSync(fp)
    const ext = path.extname(fp).toLowerCase().slice(1)
    const name = path.basename(fp)
    const isImage = ['png','jpg','jpeg','gif','webp','bmp'].includes(ext)
    const isText = ['txt','md','csv','json','xml','html','js','ts','jsx','tsx','py','java','c','cpp','go','rs','sql','bat','cmd','sh','bash','zsh','ps1','rb','php','swift','kt','kts','scala','lua','pl','r','yaml','yml','toml','ini','cfg','conf','env','log','diff','patch','gitignore','dockerfile'].includes(ext)
    return {
      name,
      ext,
      path: fp,
      isImage,
      isText,
      base64: isImage ? data.toString('base64') : null,
      text: isText ? data.toString('utf-8') : null,
      size: data.length,
    }
  })
})
