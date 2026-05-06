import { useState, useRef, useEffect } from 'react'
import { useProviders } from '../store/providers'
import { useSessions } from '../store/sessions'
import MessageBubble from '../components/MessageBubble'

function translateError(msg) {
  if (!msg) return '未知错误'
  if (msg.includes('prompt is too long') || msg.includes('tokens >')) return '消息内容过长，超出模型最大上下文限制，请清空对话或减少附件后重试'
  if (msg.includes('ValidationException')) return '请求参数错误：' + msg.replace(/.*ValidationException:\s*/i, '')
  if (msg.includes('ThrottlingException') || msg.includes('Too Many Requests') || msg.includes('rate limit')) return '请求过于频繁，请稍后重试'
  if (msg.includes('ExpiredTokenException') || msg.includes('token expired')) return '凭证已过期，请重新配置 API Key'
  if (msg.includes('UnrecognizedClientException') || msg.includes('InvalidSignatureException')) return 'API Key 无效或签名错误，请检查模型配置'
  if (msg.includes('AccessDeniedException') || msg.includes('not authorized')) return '没有访问权限，请检查 API Key 或 IAM 权限'
  if (msg.includes('ResourceNotFoundException') || msg.includes('Could not find model')) return '模型不存在或未开通，请检查模型 ID'
  if (msg.includes('ServiceUnavailableException') || msg.includes('Service Unavailable')) return '服务暂时不可用，请稍后重试'
  if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('Failed to fetch')) return '无法连接到服务器，请检查网络或代理设置'
  if (msg.includes('ETIMEDOUT') || msg.includes('timeout')) return '请求超时，请检查网络或稍后重试'
  return msg
}

const FILE_ICONS = {
  image: '🖼️',
  video: '🎬',
  text: '📄',
  office: '📊',
  default: '📎',
}

function fileIcon(att) {
  if (att.isImage) return FILE_ICONS.image
  const v = ['mp4','mov','avi','mkv','webm']
  if (v.includes(att.ext)) return FILE_ICONS.video
  const o = ['xlsx','xls','docx','doc','pptx','ppt']
  if (o.includes(att.ext)) return FILE_ICONS.office
  if (att.isText) return FILE_ICONS.text
  return FILE_ICONS.default
}

export default function ChatPage() {
  const { activeProvider } = useProviders()
  const { sessions, activeSession, activeId, updateSession, updateSessionMsg, createSession, getSessionMessages } = useSessions()

  // 始终指向最新 sessions，避免异步回调中的 stale closure
  // 始终指向最新 sessions，避免异步回调中的 stale closure
  const sessionsRef = useRef(sessions)
  useEffect(() => { sessionsRef.current = sessions }, [sessions])

  const messages = activeSession?.messages ?? []
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState([])
  const [streamingSessions, setStreamingSessions] = useState({})
  const streaming = !!streamingSessions[activeId]
  const [thinkingSessions, setThinkingSessions] = useState({})
  const thinking = !!thinkingSessions[activeId]
  const [statusText, setStatusText] = useState('')
  const [sessionCwd, setSessionCwd] = useState('') // 空串=使用后端默认 ~/claude
  const [showCwdInput, setShowCwdInput] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const bottomRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const userScrolledRef = useRef(false) // 用户是否滚动离开了底部
  const pickFilesRef = useRef(null)
  const textareaRef = useRef(null)
  const pendingQueues = useRef({}) // sid -> [{text, atts}]
  const isComposingRef = useRef(false) // IME 输入法合成中标志

  // 始终指向最新 activeProvider / sessionCwd，避免 drain 闭包使用过期值
  const activeProviderRef = useRef(activeProvider)
  useEffect(() => { activeProviderRef.current = activeProvider }, [activeProvider])
  const sessionCwdRef = useRef(sessionCwd)
  useEffect(() => { sessionCwdRef.current = sessionCwd }, [sessionCwd])

  useEffect(() => {
    setInput('')
    setAttachments([])
    userScrolledRef.current = false // 切换会话时重置，滚到底部展示最新消息
  }, [activeId])

  // 会话被删除时清理对应的待发队列，防止内存泄漏
  useEffect(() => {
    const ids = new Set(sessions.map(s => s.id))
    Object.keys(pendingQueues.current).forEach(sid => {
      if (!ids.has(sid)) delete pendingQueues.current[sid]
    })
  }, [sessions])

  // 当 input 被清空时（发送后），重置 textarea 高度
  useEffect(() => {
    if (!input && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [input])

  useEffect(() => {
    const offNew = window.api.menu.onNewSession(() => createSession())
    const offFile = window.api.menu.onPickFile(() => pickFilesRef.current?.())
    const offDrop = window.api.file.onDropPaths(async (paths) => {
      const results = await Promise.all(paths.map(p => window.api.file.fromPath(p)))
      setAttachments(prev => [...prev, ...results.filter(Boolean)])
    })
    return () => { offNew(); offFile(); offDrop() }
  }, [createSession])

  // 监听滚动：用户滚离底部超过 80px 则暂停自动跟随
  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    userScrolledRef.current = distanceFromBottom > 80
  }

  // 流式内容更新时：只有用户在底部才自动跟随，用 auto（即时）避免高频 smooth 产生抖动
  useEffect(() => {
    if (!userScrolledRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' })
    }
  }, [messages])

  const setMessages = (updater) => {
    if (!activeId) return
    const next = typeof updater === 'function' ? updater(messages) : updater
    updateSession(activeId, next)
  }

  const updateMsg = (sid, msgId, updater) => {
    updateSessionMsg(sid, prev => prev.map(m => m.id === msgId ? updater(m) : m))
  }

  const pickFiles = async () => {
    const files = await window.api.file.pick()
    if (files?.length) setAttachments(prev => [...prev, ...files])
  }
  pickFilesRef.current = pickFiles

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx))
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    // 文件处理由 preload 层的 onDropPaths 完成
  }

  const handlePaste = async (e) => {
    const items = Array.from(e.clipboardData?.items ?? [])
    const imageItem = items.find(it => it.kind === 'file' && it.type.startsWith('image/'))
    if (!imageItem) return
    e.preventDefault()
    const file = imageItem.getAsFile()
    if (!file) return
    const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
    const name = `screenshot_${Date.now()}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const att = await window.api.file.fromBuffer(name, ext, Array.from(new Uint8Array(arrayBuffer)))
    if (att) setAttachments(prev => [...prev, att])
  }

  const runSend = async (sid, text, atts, currentMessages) => {
    // 发送新消息时重置滚动状态，确保能看到最新的输出
    userScrolledRef.current = false

    const userMsg = {
      role: 'user',
      content: text,
      attachments: atts.length ? atts : undefined,
      id: crypto.randomUUID(),
    }
    const assistantId = crypto.randomUUID()
    const assistantMsg = { role: 'assistant', content: '', id: assistantId, streaming: true, toolCalls: [] }

    updateSession(sid, [...currentMessages, userMsg, assistantMsg])
    setStreamingSessions(prev => ({ ...prev, [sid]: true }))
    setThinkingSessions(prev => ({ ...prev, [sid]: true }))
    if (sid === activeId) setStatusText('正在思考…')

    const history = [...currentMessages, userMsg].map(m => ({
      role: m.role, content: m.content, attachments: m.attachments,
    }))

    try {
      await window.api.chat.stream(
        activeProviderRef.current, history, sessionCwdRef.current || undefined, sid,
        (data) => {
          if (data.type === 'text') {
            setThinkingSessions(prev => ({ ...prev, [sid]: false }))
            if (sid === activeId) setStatusText('正在生成回复…')
            updateMsg(sid, assistantId, m => ({ ...m, content: m.content + data.text }))
          }
        },
        (data) => {
          setThinkingSessions(prev => ({ ...prev, [sid]: false }))
          if (sid === activeId) setStatusText(`执行工具：${data.name}`)
          updateMsg(sid, assistantId, m => ({
            ...m,
            // 保存 toolUseId 供后续重建对话历史使用
            toolCalls: [...m.toolCalls, { toolUseId: data.id, name: data.name, input: data.input, status: 'running', id: crypto.randomUUID() }],
          }))
        },
        (data) => {
          setThinkingSessions(prev => ({ ...prev, [sid]: true }))
          if (sid === activeId) setStatusText('正在思考…')
          updateMsg(sid, assistantId, m => {
            const calls = [...m.toolCalls]
            const idx = calls.findLastIndex(c => c.name === data.name && c.status === 'running')
            if (idx >= 0) calls[idx] = { ...calls[idx], status: 'done', result: data.result }
            return { ...m, toolCalls: calls }
          })
        }
      )
    } catch (err) {
      const isAbort = err.name === 'AbortError' || err.message === 'aborted' || err.message?.includes('aborted')
      if (!isAbort) {
        updateMsg(sid, assistantId, m => ({ ...m, content: m.content + `\n\n[错误] ${translateError(err.message)}`, error: true }))
      }
    } finally {
      updateMsg(sid, assistantId, m => ({ ...m, streaming: false }))
      setStreamingSessions(prev => { const n = { ...prev }; delete n[sid]; return n })
      setThinkingSessions(prev => { const n = { ...prev }; delete n[sid]; return n })
      if (sid === activeId) setStatusText('')
    }
  }

  const sendMessage = async () => {
    const text = input.trim()
    if ((!text && !attachments.length) || !activeProvider) return

    let sid = activeId
    if (!sid) sid = createSession()

    const atts = [...attachments]
    setInput('')
    setAttachments([])

    if (streamingSessions[sid]) {
      // 正在运行，入队并立即展示占位消息
      const userMsg = { role: 'user', content: text, attachments: atts.length ? atts : undefined, id: crypto.randomUUID() }
      const waitingId = crypto.randomUUID()
      const waitingMsg = { role: 'assistant', content: '⏳ 等待上一个任务完成后执行…', id: waitingId, streaming: false, waiting: true, toolCalls: [] }
      updateSession(sid, [...getSessionMessages(sid), userMsg, waitingMsg])
      if (!pendingQueues.current[sid]) pendingQueues.current[sid] = []
      pendingQueues.current[sid].push({ text, atts, waitingId })
      return
    }

    const drain = async (s) => {
      const queue = pendingQueues.current[s]
      if (!queue?.length) return
      const next = queue.shift()
      // 通过 ref 读取最新 sessions，避免 stale closure 导致丢失第一条回复
      const all = sessionsRef.current.find(sess => sess.id === s)?.messages ?? []
      const withoutWaiting = all.filter(m => m.id !== next.waitingId)
      // currentMessages = 占位前的所有消息（不含 user+waiting 占位对）
      const waitingIdx = all.findIndex(m => m.id === next.waitingId)
      const currentMessages = waitingIdx >= 1 ? all.slice(0, waitingIdx - 1) : withoutWaiting
      // 先把占位从 session 里删掉再追加真实消息
      updateSession(s, withoutWaiting.slice(0, waitingIdx >= 1 ? waitingIdx - 1 : withoutWaiting.length))
      await runSend(s, next.text, next.atts, currentMessages)
      if (pendingQueues.current[s]?.length) drain(s)
    }

    await runSend(sid, text, atts, messages)
    if (pendingQueues.current[sid]?.length) drain(sid)
  }

  const handleKeyDown = (e) => {
    // isComposingRef.current 为 true 时说明正在用输入法合成（如中文拼音），
    // 此时 Enter 是确认候选词，不应触发发送
    if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!activeProvider) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
        <div className="text-4xl mb-1">⚙️</div>
        <p>请先点击左侧齿轮图标，激活一个模型配置</p>
      </div>
    )
  }

  return (
    <div
      className={`flex-1 flex flex-col overflow-hidden relative ${isDragOver ? 'ring-2 ring-inset ring-indigo-500' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-indigo-950/60 pointer-events-none">
          <div className="text-indigo-300 text-lg font-medium">松开以添加附件</div>
        </div>
      )}
      {/* 顶部栏 */}
      <div className="px-4 py-2.5 border-b border-slate-800 flex items-center gap-2 text-sm text-slate-400">
        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
        <span className="font-medium text-slate-300">{activeProvider.name}</span>
        <span className="text-slate-700">·</span>
        <span className="text-slate-500">{activeProvider.modelId}</span>
        <button
          onClick={() => setShowCwdInput(v => !v)}
          className="ml-2 px-2 py-0.5 text-xs bg-slate-800 hover:bg-slate-700 rounded text-slate-400 truncate max-w-[200px]"
          title="设置工作目录（默认：~/claude）"
        >
          📁 {sessionCwd || '~/claude'}
        </button>
        <button
          onClick={() => {
            setMessages([])
            // 同步清除后端的 session 历史缓存
            if (activeId) window.api.chat.clear(activeId)
          }}
          className="ml-auto px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
        >
          清空
        </button>
      </div>

      {showCwdInput && (
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-900 flex gap-2 items-center">
          <input
            className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-indigo-500 min-w-0"
            placeholder="手动粘贴工作目录路径，或点击「浏览」选择文件夹"
            value={sessionCwd}
            onChange={e => setSessionCwd(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setShowCwdInput(false)}
          />
          <button
            onClick={async () => {
              try {
                const dir = await window.api.file.pickDir()
                if (dir) setSessionCwd(dir)
              } catch (e) {
                console.error('pickDir failed:', e)
              }
            }}
            className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors shrink-0"
          >
            浏览…
          </button>
          <button
            onClick={() => setSessionCwd('')}
            className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-400 rounded transition-colors shrink-0"
            title="重置为默认目录 ~/claude"
          >
            重置
          </button>
          <button
            onClick={() => setShowCwdInput(false)}
            className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors shrink-0"
          >
            确定
          </button>
        </div>
      )}

      {/* 消息列表 */}
      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {messages.length === 0 && (
          <div className="text-center text-slate-600 mt-20">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-sm">开始对话</p>
            <p className="text-xs mt-1 text-slate-700">支持文件读写、执行命令、代码搜索等工具调用</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            thinking={thinking && i === messages.length - 1 && msg.role === 'assistant'}
            statusText={i === messages.length - 1 && msg.role === 'assistant' ? statusText : ''}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 附件预览 */}
      {attachments.length > 0 && (
        <div className="px-4 pt-2 flex flex-wrap gap-2 border-t border-slate-800 bg-slate-900/50">
          {attachments.map((att, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 max-w-[180px]">
              <span>{fileIcon(att)}</span>
              <span className="truncate flex-1">{att.name}</span>
              <button onClick={() => removeAttachment(i)} className="text-slate-500 hover:text-red-400 shrink-0 ml-1">×</button>
            </div>
          ))}
        </div>
      )}

      {/* 输入区 */}
      <div className="px-4 py-3 border-t border-slate-800">
        <div className="flex gap-2 items-end">
          <button
            onClick={pickFiles}
            title="添加附件"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-400 hover:text-slate-200 transition-colors shrink-0 text-lg"
          >
            📎
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onCompositionStart={() => { isComposingRef.current = true }}
            onCompositionEnd={() => { isComposingRef.current = false }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="输入消息… (Enter 发送，Shift+Enter 换行，可粘贴截图)"
            rows={1}
            className="flex-1 resize-none bg-slate-800 border border-slate-700 focus:border-indigo-500 text-slate-200 placeholder-slate-500 rounded-xl px-4 py-3 text-sm outline-none transition-colors min-h-[48px] max-h-[200px]"
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
            }}
          />
          {streaming && (
            <button
              onClick={() => window.api.chat.abort()}
              className="px-4 py-3 bg-red-700 hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-colors shrink-0"
            >
              停止
            </button>
          )}
          <button
            onClick={sendMessage}
            disabled={!input.trim() && !attachments.length}
            className="px-4 py-3 bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors shrink-0"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}
