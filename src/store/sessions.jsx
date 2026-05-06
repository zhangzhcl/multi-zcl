import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const Ctx = createContext(null)

const STORAGE_KEY = 'multi-zcl-sessions'

function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

export function SessionStore({ children }) {
  const [sessions, setSessions] = useState(loadSessions)
  const [activeId, setActiveId] = useState(() => {
    const s = loadSessions()
    return s.length > 0 ? s[0].id : null
  })

  useEffect(() => { saveSessions(sessions) }, [sessions])

  const createSession = useCallback((title = '新对话') => {
    const id = crypto.randomUUID()
    const session = { id, title, messages: [], createdAt: Date.now() }
    setSessions(prev => [session, ...prev])
    setActiveId(id)
    return id
  }, [])

  const updateSession = useCallback((id, messages) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== id) return s
      const firstUser = messages.find(m => m.role === 'user')
      let title = s.title
      if (firstUser) {
        if (firstUser.content?.trim()) {
          // 有文字内容，用文字作标题
          title = firstUser.content.slice(0, 30) + (firstUser.content.length > 30 ? '...' : '')
        } else if (firstUser.attachments?.length) {
          // 只有附件没有文字，用附件名作标题
          const first = firstUser.attachments[0].name
          title = firstUser.attachments.length > 1
            ? `[${first}] 等${firstUser.attachments.length}个文件`
            : `[${first}]`
        }
      }
      return { ...s, title, messages, updatedAt: Date.now() }
    }))
  }, [])

  // 函数式更新单条消息，避免闭包捕获旧 messages
  const updateSessionMsg = useCallback((id, msgUpdater) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== id) return s
      const messages = msgUpdater(s.messages)
      const firstUser = messages.find(m => m.role === 'user')
      let title = s.title
      if (firstUser) {
        if (firstUser.content?.trim()) {
          title = firstUser.content.slice(0, 30) + (firstUser.content.length > 30 ? '...' : '')
        } else if (firstUser.attachments?.length) {
          const first = firstUser.attachments[0].name
          title = firstUser.attachments.length > 1
            ? `[${first}] 等${firstUser.attachments.length}个文件`
            : `[${first}]`
        }
      }
      return { ...s, title, messages, updatedAt: Date.now() }
    }))
  }, [])

  const deleteSession = useCallback((id) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id)
      if (activeId === id) {
        setActiveId(next.length > 0 ? next[0].id : null)
      }
      return next
    })
  }, [activeId])

  const activeSession = sessions.find(s => s.id === activeId) ?? null

  const getSessionMessages = useCallback((id) => {
    return sessions.find(s => s.id === id)?.messages ?? []
  }, [sessions])

  return (
    <Ctx.Provider value={{ sessions, activeId, activeSession, setActiveId, createSession, updateSession, updateSessionMsg, deleteSession, getSessionMessages }}>
      {children}
    </Ctx.Provider>
  )
}

export const useSessions = () => useContext(Ctx)
