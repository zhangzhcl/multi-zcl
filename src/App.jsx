import { useState, useEffect } from 'react'
import { ProviderStore, useProviders } from './store/providers'
import { SessionStore, useSessions } from './store/sessions'
import { SkillsStore, useSkills } from './store/skills'
import ProvidersPage from './pages/ProvidersPage'
import ChatPage from './pages/ChatPage'
import SkillsPage from './pages/SkillsPage'
import logoUrl from '/logo.svg'

// SVG 图标组件
function IconChat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}



function IconMarket() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" />
    </svg>
  )
}

function SessionSidebar() {
  const { sessions, activeId, setActiveId, createSession, deleteSession } = useSessions()

  return (
    <div className="w-52 flex flex-col bg-slate-900 border-r border-slate-800 shrink-0">
      <div className="px-3 py-3 border-b border-slate-800 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">对话历史</span>
        <button
          onClick={() => createSession()}
          title="新建对话"
          className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <IconPlus />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {sessions.length === 0 && (
          <div className="text-center text-slate-600 text-xs mt-8 px-3">
            暂无对话记录<br />点击 + 新建
          </div>
        )}
        {sessions.map(s => (
          <div
            key={s.id}
            onClick={() => setActiveId(s.id)}
            className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
              s.id === activeId ? 'bg-slate-700/60 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <span className="flex-1 text-xs truncate">{s.title}</span>
            <button
              onClick={e => { e.stopPropagation(); deleteSession(s.id) }}
              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all shrink-0"
              title="删除"
            >
              <IconTrash />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function Layout() {
  const isMac = window.api.platform === 'darwin'
  const [page, setPage] = useState('chat')
  const { activeProvider } = useProviders()
  const { createSession } = useSessions()
  const { fetchInstalled } = useSkills()

  // 启动时加载已安装技能
  useEffect(() => {
    fetchInstalled()
  }, [])

  return (
    <div className="flex flex-col h-screen bg-[#0f1117] text-slate-200">
      {/* Mac 专用拖拽标题栏：为流量灯按钮留出空间 */}
      {isMac && (
        <div className="h-7 shrink-0 bg-slate-950" style={{ WebkitAppRegion: 'drag' }} />
      )}
      <div className="flex flex-1 overflow-hidden">
      {/* 左侧图标导航 */}
      <nav className="w-12 flex flex-col items-center py-3 gap-1 bg-slate-950 border-r border-slate-800 shrink-0">
        <img src={logoUrl} alt="logo" className="w-7 h-7 mb-3 rounded-lg select-none" />

        {/* 对话按钮 */}
        <button
          onClick={() => setPage('chat')}
          title="对话"
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
            page === 'chat' ? 'bg-green-700 text-white' : 'text-green-600 hover:text-green-400 hover:bg-slate-800'
          }`}
        >
          <IconChat />
        </button>

        {/* 配置模型按钮 */}
        <button
          onClick={() => setPage('providers')}
          title="配置"
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
            page === 'providers' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
          }`}
        >
          <IconSettings />
        </button>

        {/* 技能市场按钮 */}
        <button
          onClick={() => setPage('skills')}
          title="技能"
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
            page === 'skills' ? 'bg-amber-700 text-white' : 'text-amber-600 hover:text-amber-400 hover:bg-slate-800'
          }`}
        >
          <IconMarket />
        </button>

        {/* 底部：状态指示 */}
        <div className="mt-auto mb-1">
          <div
            title={activeProvider ? `已激活: ${activeProvider.name}` : '未激活任何配置'}
            className={`w-2 h-2 rounded-full mx-auto ${activeProvider ? 'bg-green-500' : 'bg-slate-600'}`}
          />
        </div>
      </nav>

      {/* 对话历史侧边栏（仅对话页显示） */}
      {page === 'chat' && <SessionSidebar />}

      {/* 主内容 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {page === 'chat' && <ChatPage />}
        {page === 'providers' && <ProvidersPage />}
        {page === 'skills' && <SkillsPage />}
      </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ProviderStore>
      <SessionStore>
        <SkillsStore>
          <Layout />
        </SkillsStore>
      </SessionStore>
    </ProviderStore>
  )
}
