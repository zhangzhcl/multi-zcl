import { useState } from 'react'
import { useProviders } from '../store/providers'
import ProviderForm from '../components/ProviderForm'

export default function ProvidersPage() {
  const { providers, activeId, activate, deactivate, remove, loading } = useProviders()
  const [editing, setEditing] = useState(null) // null | 'new' | provider object

  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-400">加载中...</div>

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* 列表区 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-semibold text-white">模型配置管理</h1>
            <button
              onClick={() => setEditing('new')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              + 添加模型配置
            </button>
          </div>

          {providers.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <div className="text-4xl mb-3">🔌</div>
              <p>还没有模型配置，点击上方按钮添加</p>
            </div>
          )}

          <div className="space-y-3">
            {providers.map(p => (
              <ProviderCard
                key={p.id}
                provider={p}
                isActive={p.id === activeId}
                onEdit={() => setEditing(p)}
                onActivate={() => p.id === activeId ? deactivate() : activate(p.id)}
                onDelete={() => {
                  if (confirm(`确认删除「${p.name}」？`)) remove(p.id)
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 侧边表单 */}
      {editing && (
        <div className="w-96 border-l border-slate-700 bg-slate-900 overflow-y-auto">
          <ProviderForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? null : editing}
            onClose={() => setEditing(null)}
          />
        </div>
      )}
    </div>
  )
}

function ProviderCard({ provider, isActive, onEdit, onActivate, onDelete }) {
  return (
    <div className={`rounded-xl p-4 border transition-all ${isActive ? 'border-indigo-500 bg-indigo-950/30' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-white truncate">{provider.name}</span>
            {isActive && (
              <span className="shrink-0 px-2 py-0.5 text-xs bg-indigo-600 text-white rounded-full">激活中</span>
            )}
            <span className="shrink-0 px-2 py-0.5 text-xs bg-slate-700 text-slate-300 rounded-full">
              {provider.sdkType === 'anthropic' ? 'Anthropic' : 'OpenAI'}
            </span>
          </div>
          <p className="text-sm text-slate-400 truncate">{provider.baseUrl}</p>
          <p className="text-xs text-slate-500 mt-0.5">{provider.modelId}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onActivate}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              isActive
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {isActive ? '停用' : '激活'}
          </button>
          <button
            onClick={onEdit}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          >
            编辑
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-950 hover:bg-red-900 text-red-400 transition-colors"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  )
}
