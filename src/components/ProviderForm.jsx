import { useState, useRef } from 'react'
import { useProviders, PRESETS } from '../store/providers'

const EMPTY = {
  name: '',
  sdkType: 'anthropic',
  modelId: '',
  envVars: {},
}

const INPUT = "w-full bg-slate-800 border border-slate-600 focus:border-indigo-500 text-slate-100 placeholder-slate-500 rounded-lg px-3 py-2 text-sm outline-none transition-colors"

// 如果用户把整个 settings.json 粘贴进来，自动展开 .env 子对象
function normalizeEnvVars(envVars) {
  if (!envVars || typeof envVars !== 'object') return {}
  if (envVars.env && typeof envVars.env === 'object' &&
      (envVars.env.AWS_ACCESS_KEY_ID || envVars.env.CLAUDE_CODE_USE_BEDROCK || envVars.env.ANTHROPIC_API_KEY)) {
    return envVars.env
  }
  return envVars
}

export default function ProviderForm({ initial, onClose }) {
  const { save } = useProviders()
  const initialEnv = normalizeEnvVars(initial?.envVars)
  const initialModelId = initial?.modelId || initialEnv.ANTHROPIC_MODEL || initialEnv.ANTHROPIC_DEFAULT_SONNET_MODEL || ''
  const [form, setForm] = useState(initial
    ? { ...initial, modelId: initialModelId, envVars: initialEnv }
    : { ...EMPTY, id: crypto.randomUUID() })
  const [envText, setEnvText] = useState(JSON.stringify(initialEnv, null, 2))
  const [envError, setEnvError] = useState('')
  const [mode, setMode] = useState('form') // 'form' | 'json'
  const [saving, setSaving] = useState(false)
  const [newKey, setNewKey] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleModelIdChange = (v) => {
    setForm(f => {
      const envVars = { ...f.envVars }
      if ('ANTHROPIC_DEFAULT_SONNET_MODEL' in envVars) {
        envVars.ANTHROPIC_DEFAULT_SONNET_MODEL = v
        setEnvText(JSON.stringify(envVars, null, 2))
      }
      return { ...f, modelId: v, envVars }
    })
  }

  const SDK_DEFAULT_ENV = {
    anthropic: { ANTHROPIC_API_KEY: '', ANTHROPIC_BASE_URL: '' },
    openai: { OPENAI_API_KEY: '', OPENAI_BASE_URL: '' },
  }

  const handleSdkChange = (v) => {
    const defaultEnv = SDK_DEFAULT_ENV[v] ?? {}
    setForm(f => ({ ...f, sdkType: v, envVars: defaultEnv }))
    setEnvText(JSON.stringify(defaultEnv, null, 2))
  }

  const applyPreset = (preset) => {
    setForm(f => ({
      ...f,
      name: preset.label,
      sdkType: preset.sdkType,
      modelId: preset.modelId,
      modelOptions: preset.modelOptions ?? null,
      envVars: { ...preset.envVars },
    }))
    setEnvText(JSON.stringify(preset.envVars, null, 2))
  }

  const handleEnvChange = (text) => {
    setEnvText(text)
    try {
      const parsed = JSON.parse(text)
      setForm(f => ({ ...f, envVars: parsed }))
      setEnvError('')
    } catch {
      setEnvError('JSON 格式错误')
    }
  }

  // 单个 env key-value 更新（表单模式）
  const setEnvKey = (k, v) => {
    setForm(f => {
      const next = { ...f.envVars, [k]: v }
      setEnvText(JSON.stringify(next, null, 2))
      return { ...f, envVars: next }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (envError) return
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await save(form)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-white">{initial ? '编辑 Provider' : '添加 Provider'}</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
      </div>

      {/* 预设 */}
      <div className="mb-4">
        <p className="text-xs text-slate-500 mb-2">快速填充预设</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button key={p.label} type="button" onClick={() => applyPreset(p)}
              className="px-2.5 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md transition-colors">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 基础字段 */}
        <Field label="名称" required>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="例：公司网关" className={INPUT} required />
        </Field>

        <Field label="SDK 类型" required>
          <select value={form.sdkType} onChange={e => handleSdkChange(e.target.value)}
            className={INPUT}>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI 兼容</option>
          </select>
        </Field>

        <Field label="对话用模型 ID" hint="app 内对话时使用，不影响 claude CLI">
          {form.modelOptions?.length ? (
            <div className="space-y-2">
              <select
                value={form.modelOptions.includes(form.modelId) ? form.modelId : '__custom__'}
                onChange={e => {
                  if (e.target.value === '__custom__') {
                    handleModelIdChange('')
                  } else {
                    handleModelIdChange(e.target.value)
                  }
                }}
                className={INPUT}
              >
                {form.modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
                <option value="__custom__">自定义输入...</option>
              </select>
              {!form.modelOptions.includes(form.modelId) && (
                <input
                  value={form.modelId}
                  onChange={e => handleModelIdChange(e.target.value)}
                  placeholder="输入自定义模型 ID"
                  className={INPUT}
                  autoFocus
                />
              )}
            </div>
          ) : (
            <input value={form.modelId} onChange={e => handleModelIdChange(e.target.value)}
              placeholder="claude-sonnet-4-6 / glm-4 / deepseek-chat"
              className={INPUT} />
          )}
        </Field>

        {/* env 变量 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-slate-400">环境变量 <span className="text-slate-600">（写入 ~/.claude/settings.json env 块）</span></label>
            <div className="flex gap-1">
              <button type="button" onClick={() => setMode('form')}
                className={`px-3 py-0.5 text-xs rounded whitespace-nowrap transition-colors ${mode === 'form' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                表单
              </button>
              <button type="button" onClick={() => setMode('json')}
                className={`px-3 py-0.5 text-xs rounded whitespace-nowrap transition-colors ${mode === 'json' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                JSON
              </button>
            </div>
          </div>

          {mode === 'json' ? (
            <div>
              <textarea
                value={envText}
                onChange={e => handleEnvChange(e.target.value)}
                rows={10}
                className={`${INPUT} font-mono text-xs resize-y`}
                placeholder={'{\n  "ANTHROPIC_API_KEY": "sk-...",\n  "ANTHROPIC_BASE_URL": "https://..."\n}'}
              />
              {envError && <p className="text-red-400 text-xs mt-1">{envError}</p>}
              <p className="text-slate-600 text-xs mt-1">直接粘贴你的 env 配置块</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(form.envVars).map(([k, v]) => (
                <div key={k} className="bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs text-slate-400">{k}</span>
                    <button type="button" onClick={() => {
                      const next = { ...form.envVars }
                      delete next[k]
                      setForm(f => ({ ...f, envVars: next }))
                      setEnvText(JSON.stringify(next, null, 2))
                    }} className="text-slate-600 hover:text-red-400 text-sm leading-none">×</button>
                  </div>
                  <input
                    value={v}
                    onChange={e => setEnvKey(k, e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 focus:border-indigo-500 text-slate-100 placeholder-slate-600 rounded px-2 py-1.5 text-xs font-mono outline-none transition-colors"
                    placeholder="填入值..."
                  />
                </div>
              ))}
              <div className="flex gap-2 mt-1">
                <input
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const k = newKey.trim()
                      if (k && !(k in form.envVars)) { setEnvKey(k, ''); setNewKey('') }
                    }
                  }}
                  placeholder="新变量名，按 Enter 添加"
                  className="flex-1 bg-slate-800 border border-slate-700 focus:border-indigo-500 text-slate-300 placeholder-slate-600 rounded px-2 py-1.5 text-xs font-mono outline-none"
                />
                <button type="button"
                  onClick={() => {
                    const k = newKey.trim()
                    if (k && !(k in form.envVars)) { setEnvKey(k, ''); setNewKey('') }
                  }}
                  className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded whitespace-nowrap">
                  + 添加
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">
            取消
          </button>
          <button type="submit" disabled={saving || !!envError}
            className="flex-1 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
        {hint && <span className="text-slate-600 ml-1">{hint}</span>}
      </label>
      {children}
    </div>
  )
}
