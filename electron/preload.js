const { contextBridge, ipcRenderer, webUtils } = require('electron')

// 在 preload 层捕获 drop，趁 File 对象还在用 webUtils 取真实路径，再分发给渲染进程
const dropCallbacks = new Set()
window.addEventListener('drop', (e) => {
  const files = Array.from(e.dataTransfer?.files ?? [])
  if (!files.length) return
  const paths = files.map(f => webUtils.getPathForFile(f)).filter(Boolean)
  if (paths.length) dropCallbacks.forEach(fn => fn(paths))
}, true)

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,
  skills: {
    list: () => ipcRenderer.invoke('skills:list'),
    fetch: (category, query, page) => ipcRenderer.invoke('skills:fetch', category, query, page),
    install: (ownerName, slug) => ipcRenderer.invoke('skills:install', ownerName, slug),
    uninstall: (slug) => ipcRenderer.invoke('skills:uninstall', slug),
  },
  providers: {
    list: () => ipcRenderer.invoke('providers:list'),
    save: (provider) => ipcRenderer.invoke('providers:save', provider),
    delete: (id) => ipcRenderer.invoke('providers:delete', id),
    activate: (id) => ipcRenderer.invoke('providers:activate', id),
    deactivate: () => ipcRenderer.invoke('providers:deactivate'),
  },
  claudeSettings: {
    read: () => ipcRenderer.invoke('claude-settings:read'),
  },
  chat: {
    stream: (provider, messages, sessionCwd, sessionId, onChunk, onToolStart, onToolEnd) => {
      const chunkFn = (_, data) => onChunk(data)
      const toolStartFn = (_, data) => onToolStart?.(data)
      const toolEndFn = (_, data) => onToolEnd?.(data)
      ipcRenderer.on('chat:chunk', chunkFn)
      ipcRenderer.on('chat:tool_start', toolStartFn)
      ipcRenderer.on('chat:tool_end', toolEndFn)
      return ipcRenderer
        .invoke('chat:stream', provider, messages, sessionCwd, sessionId)
        .finally(() => {
          ipcRenderer.removeListener('chat:chunk', chunkFn)
          ipcRenderer.removeListener('chat:tool_start', toolStartFn)
          ipcRenderer.removeListener('chat:tool_end', toolEndFn)
        })
    },
    abort: () => ipcRenderer.invoke('chat:abort'),
    clear: (sessionId) => ipcRenderer.invoke('chat:clear', sessionId),
  },
  file: {
    pickDir: () => ipcRenderer.invoke('file:pickDir'),
    pick: () => ipcRenderer.invoke('file:pick'),
    fromPath: (filePath) => ipcRenderer.invoke('file:fromPath', filePath),
    fromBuffer: (name, ext, buffer) => ipcRenderer.invoke('file:fromBuffer', name, ext, buffer),
    onDropPaths: (fn) => {
      dropCallbacks.add(fn)
      return () => dropCallbacks.delete(fn)
    },
  },
  proxy: {
    get: () => ipcRenderer.invoke('proxy:get'),
    set: (url) => ipcRenderer.invoke('proxy:set', url),
  },
  menu: {
    onNewSession: (fn) => {
      const handler = () => fn()
      ipcRenderer.on('menu:new-session', handler)
      return () => ipcRenderer.removeListener('menu:new-session', handler)
    },
    onPickFile: (fn) => {
      const handler = () => fn()
      ipcRenderer.on('menu:pick-file', handler)
      return () => ipcRenderer.removeListener('menu:pick-file', handler)
    },
  },
})
