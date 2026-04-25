import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'

const Ctx = createContext(null)

export const PRESETS = [
  // ─── Claude ──────────────────────────────────────────────────────────────
  {
    label: 'Claude-wrok',
    sdkType: 'anthropic',
    envVars: {
      ANTHROPIC_API_KEY: '',
      ANTHROPIC_BASE_URL: '',
    },
    modelId: 'claude-sonnet-4-6',
  },
  {
    label: 'AWS Bedrock',
    sdkType: 'anthropic',
    envVars: {
      ANTHROPIC_BASE_URL: 'https://bedrock-runtime.us-east-1.amazonaws.com',
      ANTHROPIC_MODEL: '',
      CLAUDE_CODE_USE_BEDROCK: '1',
      AWS_ACCESS_KEY_ID: '',
      AWS_SECRET_ACCESS_KEY: '',
      AWS_REGION: 'us-east-1',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
      API_TIMEOUT_MS: '30000000',
    },
    modelId: '',
  },

  // ─── DeepSeek ─────────────────────────────────────────────────────────────
  // 官方文档确认有 Anthropic 兼容端点，认证用 ANTHROPIC_AUTH_TOKEN
  {
    label: 'DeepSeek (Anthropic)',
    sdkType: 'anthropic',
    envVars: {
      ANTHROPIC_AUTH_TOKEN: '',
      ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'deepseek-v4-pro',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'deepseek-v4-pro',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'deepseek-v4-flash',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    },
    modelId: 'deepseek-v4-pro',
    modelOptions: ['deepseek-v4-pro', 'deepseek-v4-flash'],
  },
  {
    label: 'DeepSeek (OpenAI)',
    sdkType: 'openai',
    envVars: {
      ANTHROPIC_API_KEY: '',
      ANTHROPIC_BASE_URL: 'https://api.deepseek.com/v1',
    },
    modelId: 'deepseek-chat',
    modelOptions: ['deepseek-chat', 'deepseek-reasoner'],
  },

  // ─── GLM 智谱 ─────────────────────────────────────────────────────────────
  // 认证用 ANTHROPIC_AUTH_TOKEN，有完整 Anthropic 兼容端点
  {
    label: 'GLM Anthropic',
    sdkType: 'anthropic',
    envVars: {
      ANTHROPIC_AUTH_TOKEN: '',
      ANTHROPIC_BASE_URL: 'https://open.bigmodel.cn/api/anthropic',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'glm-5.1',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'glm-5.1',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-4.5-Air',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
      API_TIMEOUT_MS: '3000000',
    },
    modelId: 'glm-5.1',
    modelOptions: ['glm-5.1', 'glm-4.7', 'glm-4.5-Air', 'glm-4.6v', 'glm-5v-turbo'],
  },
  {
    label: 'GLM (OpenAI)',
    sdkType: 'openai',
    envVars: {
      ANTHROPIC_API_KEY: '',
      ANTHROPIC_BASE_URL: 'https://open.bigmodel.cn/api/paas/v4',
    },
    modelId: 'glm-5.1',
    modelOptions: ['glm-5.1', 'glm-4.7', 'glm-4.5-Air', 'glm-4.6v', 'glm-5v-turbo'],
  },

  // ─── MiniMax ──────────────────────────────────────────────────────────────
  // 官方推荐 Anthropic 兼容接入，用标准 ANTHROPIC_API_KEY
  {
    label: 'MiniMax (Anthropic)',
    sdkType: 'anthropic',
    envVars: {
      ANTHROPIC_API_KEY: '',
      ANTHROPIC_BASE_URL: 'https://api.minimaxi.com/anthropic',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    },
    modelId: 'MiniMax-M2.7',
    modelOptions: ['MiniMax-M2.7', 'MiniMax-M2.7-highspeed', 'MiniMax-M2.5', 'MiniMax-M2.5-highspeed', 'MiniMax-M2'],
  },
  {
    label: 'MiniMax (OpenAI)',
    sdkType: 'openai',
    envVars: {
      ANTHROPIC_API_KEY: '',
      ANTHROPIC_BASE_URL: 'https://api.minimaxi.com/v1',
    },
    modelId: 'MiniMax-M2.7',
    modelOptions: ['MiniMax-M2.7', 'MiniMax-M2.7-highspeed', 'MiniMax-M2.5', 'MiniMax-M2.5-highspeed', 'MiniMax-M2'],
  },

  // ─── 阿里云百炼 Qwen ──────────────────────────────────────────────────────
  // 仅 OpenAI 兼容，无 Anthropic 端点
  {
    label: 'Qwen Coding Plan',
    sdkType: 'openai',
    envVars: {
      ANTHROPIC_API_KEY: '',
      ANTHROPIC_BASE_URL: 'https://coding-intl.dashscope.aliyuncs.com/apps/anthropic',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    },
    modelId: 'qwen3.6-plus',
    modelOptions: ['qwen3.6-plus'],
  },
  {
    label: 'Qwen (OpenAI)',
    sdkType: 'openai',
    envVars: {
      ANTHROPIC_API_KEY: '',
      ANTHROPIC_BASE_URL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    },
    modelId: 'qwen-max',
    modelOptions: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwq-plus', 'qwen3-235b-a22b'],
  },

  // ─── Kimi / Moonshot ─────────────────────────────────────────────────────
  // 仅 OpenAI 兼容，无 Anthropic 端点
  {
    label: 'Kimi (OpenAI)',
    sdkType: 'openai',
    envVars: {
      ANTHROPIC_API_KEY: '',
      ANTHROPIC_BASE_URL: 'https://api.moonshot.cn/v1',
    },
    modelId: 'kimi-k2.6',
    modelOptions: ['kimi-k2.6', 'kimi-k2.5', 'kimi-k2-thinking', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  },
]

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD': return { ...action.payload, loading: false }
    default: return state
  }
}

export function ProviderStore({ children }) {
  const [state, dispatch] = useReducer(reducer, { providers: [], activeId: null, loading: true })

  const reload = useCallback(async () => {
    const data = await window.api.providers.list()
    dispatch({ type: 'LOAD', payload: data })
  }, [])

  useEffect(() => { reload() }, [reload])

  const save = useCallback(async (provider) => {
    await window.api.providers.save(provider)
    await reload()
  }, [reload])

  const remove = useCallback(async (id) => {
    await window.api.providers.delete(id)
    await reload()
  }, [reload])

  const activate = useCallback(async (id) => {
    await window.api.providers.activate(id)
    await reload()
  }, [reload])

  const deactivate = useCallback(async () => {
    await window.api.providers.deactivate()
    await reload()
  }, [reload])

  const activeProvider = state.providers.find(p => p.id === state.activeId) ?? null

  return (
    <Ctx.Provider value={{ ...state, activeProvider, save, remove, activate, deactivate }}>
      {children}
    </Ctx.Provider>
  )
}

export const useProviders = () => useContext(Ctx)
