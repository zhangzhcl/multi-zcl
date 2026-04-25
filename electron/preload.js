const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
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
    stream: (provider, messages, sessionCwd, onChunk, onToolStart, onToolEnd) => {
      const chunkFn = (_, data) => onChunk(data)
      const toolStartFn = (_, data) => onToolStart?.(data)
      const toolEndFn = (_, data) => onToolEnd?.(data)
      ipcRenderer.on('chat:chunk', chunkFn)
      ipcRenderer.on('chat:tool_start', toolStartFn)
      ipcRenderer.on('chat:tool_end', toolEndFn)
      return ipcRenderer
        .invoke('chat:stream', provider, messages, sessionCwd)
        .finally(() => {
          ipcRenderer.removeListener('chat:chunk', chunkFn)
          ipcRenderer.removeListener('chat:tool_start', toolStartFn)
          ipcRenderer.removeListener('chat:tool_end', toolEndFn)
        })
    },
    abort: () => ipcRenderer.invoke('chat:abort'),
  },
  file: {
    pick: () => ipcRenderer.invoke('file:pick'),
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
