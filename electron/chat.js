const { ipcMain, BrowserWindow, session } = require('electron')
const { TOOL_DEFINITIONS, executeTool } = require('./tools')
const os = require('os')
const path = require('path')
const { HttpsProxyAgent } = require('https-proxy-agent')

// 自动检测本机系统代理（127.0.0.1 本地代理优先）
async function getProxyAgent(targetUrl = 'https://bedrock-runtime.us-east-1.amazonaws.com') {
  try {
    const ses = session.defaultSession
    const proxyInfo = await ses.resolveProxy(targetUrl)
    // proxyInfo 格式: "PROXY 127.0.0.1:7890" 或 "DIRECT"
    if (!proxyInfo || proxyInfo === 'DIRECT') return undefined
    const match = proxyInfo.match(/PROXY\s+([\w.]+:\d+)/i)
    if (match) {
      return new HttpsProxyAgent(`http://${match[1]}`)
    }
  } catch {}
  return undefined
}

let currentAbortController = null

function getWin() {
  return BrowserWindow.getAllWindows()[0]
}

function send(event, data) {
  const win = getWin()
  if (win && !win.isDestroyed()) win.webContents.send(event, data)
}

function setupChatHandlers() {
  ipcMain.handle('chat:stream', async (_, provider, messages, sessionCwd) => {
    currentAbortController = new AbortController()
    const signal = currentAbortController.signal
    const cwd = sessionCwd || os.homedir()

    console.log('[chat] provider:', JSON.stringify({ name: provider.name, sdkType: provider.sdkType, modelId: provider.modelId, envKeys: Object.keys(provider.envVars || {}), isBedrock: isBedrock(provider) }))

    try {
      if (isBedrock(provider)) {
        await agentLoopBedrock(provider, messages, signal, cwd)
      } else if (provider.sdkType === 'anthropic') {
        await agentLoopAnthropic(provider, messages, signal, cwd)
      } else {
        await agentLoopOpenAI(provider, messages, signal, cwd)
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        send('chat:error', err.message)
        throw err
      }
    } finally {
      currentAbortController = null
    }
  })

  ipcMain.handle('chat:abort', () => {
    currentAbortController?.abort()
  })
}

// ─── Anthropic Agent Loop ─────────────────────────────────────────────────────

// 有些用户把整个 settings.json 粘贴进来，实际 env 在 .env 子块里
function resolveEnv(provider) {
  const raw = provider.envVars || {}
  // 如果顶层有 "env" 子对象且有 AWS_ACCESS_KEY_ID 等 key，说明是整个 settings.json
  if (raw.env && typeof raw.env === 'object' && (raw.env.AWS_ACCESS_KEY_ID || raw.env.CLAUDE_CODE_USE_BEDROCK)) {
    return raw.env
  }
  return raw
}

function isBedrock(provider) {
  const env = resolveEnv(provider)
  return env.CLAUDE_CODE_USE_BEDROCK === '1'
    || !!env.AWS_ACCESS_KEY_ID
    || (env.ANTHROPIC_BASE_URL || '').includes('bedrock-runtime.amazonaws.com')
}

async function resolveAnthropicClient(provider) {
  const env = resolveEnv(provider)
  const agent = await getProxyAgent()

  if (isBedrock(provider)) {
    // 直接返回 null，agentLoopAnthropic 里检测到 bedrock 走专用路径
    return null
  }

  const Anthropic = require('@anthropic-ai/sdk')
  const apiKey = env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN || 'dummy'
  const baseURL = env.ANTHROPIC_BASE_URL || undefined
  const opts = { apiKey, baseURL }
  if (agent) opts.httpAgent = agent
  return new Anthropic.default(opts)
}

async function agentLoopBedrock(provider, messages, signal, cwd) {
  const { BedrockRuntimeClient, ConverseStreamCommand } = require('@aws-sdk/client-bedrock-runtime')
  const { NodeHttpHandler } = require('@smithy/node-http-handler')
  const env = resolveEnv(provider)
  const agent = await getProxyAgent()

  const clientConfig = {
    region: env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      sessionToken: env.AWS_SESSION_TOKEN || undefined,
    },
  }
  if (agent) clientConfig.requestHandler = new NodeHttpHandler({ httpsAgent: agent })

  const client = new BedrockRuntimeClient(clientConfig)
  const modelId = env.ANTHROPIC_MODEL || provider.modelId

  const SYSTEM = buildSystemPrompt(cwd)

  // 转换工具定义为 Bedrock ConverseStream 格式
  const tools = TOOL_DEFINITIONS.map(t => ({
    toolSpec: {
      name: t.name,
      description: t.description,
      inputSchema: { json: t.input_schema },
    },
  }))

  // 转换消息格式
  function toBedrockMessages(msgs) {
    return msgs.map(m => {
      if (typeof m.content === 'string') {
        return { role: m.role, content: [{ text: m.content || ' ' }] }
      }
      // tool_result messages
      if (Array.isArray(m.content)) {
        if (m.role === 'user') {
          return {
            role: 'user',
            content: m.content.map(c => {
              if (c.type === 'tool_result') {
                return { toolResult: { toolUseId: c.tool_use_id, content: [{ text: String(c.content) }] } }
              }
              if (c.type === 'text') return { text: c.text }
              return { text: JSON.stringify(c) }
            }),
          }
        }
        // assistant with tool_use
        return {
          role: 'assistant',
          content: m.content.map(c => {
            if (c.type === 'text') return { text: c.text || ' ' }
            if (c.type === 'tool_use') return { toolUse: { toolUseId: c.id, name: c.name, input: c.input } }
            return { text: JSON.stringify(c) }
          }),
        }
      }
      return { role: m.role, content: [{ text: String(m.content || ' ') }] }
    })
  }

  let msgs = toAnthropicMessages(messages) // 先转成统一格式

  for (let turn = 0; turn < 50; turn++) {
    if (signal.aborted) break

    const bedrockMsgs = toBedrockMessages(msgs)

    const cmd = new ConverseStreamCommand({
      modelId,
      system: [{ text: SYSTEM }],
      messages: bedrockMsgs,
      toolConfig: { tools },
      inferenceConfig: { maxTokens: 8096 },
    })

    const response = await client.send(cmd)

    const assistantContent = []
    let currentText = ''
    let currentToolUse = null

    for await (const event of response.stream) {
      if (signal.aborted) break

      if (event.contentBlockStart?.start?.toolUse) {
        if (currentText) { assistantContent.push({ type: 'text', text: currentText }); currentText = '' }
        const tu = event.contentBlockStart.start.toolUse
        currentToolUse = { type: 'tool_use', id: tu.toolUseId, name: tu.name, input: {}, _inputRaw: '' }
        assistantContent.push(currentToolUse)
      } else if (event.contentBlockDelta?.delta?.text) {
        const t = event.contentBlockDelta.delta.text
        currentText += t
        send('chat:chunk', { type: 'text', text: t })
      } else if (event.contentBlockDelta?.delta?.toolUse) {
        if (currentToolUse) currentToolUse._inputRaw += event.contentBlockDelta.delta.toolUse.input || ''
      } else if (event.contentBlockStop !== undefined) {
        if (currentToolUse) {
          try { currentToolUse.input = JSON.parse(currentToolUse._inputRaw || '{}') } catch { currentToolUse.input = {} }
          delete currentToolUse._inputRaw
          currentToolUse = null
        }
      } else if (event.messageStop) {
        if (currentText) { assistantContent.push({ type: 'text', text: currentText }); currentText = '' }
      }
    }

    if (signal.aborted) break
    if (currentText) { assistantContent.push({ type: 'text', text: currentText }); currentText = '' }

    const toolUses = assistantContent.filter(b => b.type === 'tool_use')
    if (toolUses.length === 0) break

    msgs = [...msgs, { role: 'assistant', content: assistantContent }]

    const toolResults = []
    for (const tu of toolUses) {
      send('chat:tool_start', { name: tu.name, input: tu.input })
      const result = await executeTool(tu.name, tu.input, cwd)
      send('chat:tool_end', { name: tu.name, result })
      toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) })
    }

    msgs = [...msgs, { role: 'user', content: toolResults }]
  }
}

function resolveModel(provider) {
  const env = resolveEnv(provider)
  // Bedrock 优先用 ANTHROPIC_MODEL（完整 ARN/模型ID）
  if (isBedrock(provider)) {
    return env.ANTHROPIC_MODEL || provider.modelId || 'us.anthropic.claude-sonnet-4-5-20251101-v1:0'
  }
  return provider.modelId
    || env.ANTHROPIC_MODEL
    || env.ANTHROPIC_DEFAULT_SONNET_MODEL
    || env.CLAUDE_MODEL
    || 'claude-sonnet-4-6'
}

// 把前端消息格式转成 Anthropic messages 格式（支持附件）
function toAnthropicMessages(messages) {
  return messages.map(m => {
    if (m.role !== 'user' || !m.attachments?.length) {
      return { role: m.role, content: m.content }
    }
    const content = []
    // 图片附件
    for (const att of m.attachments) {
      if (att.isImage && att.base64) {
        const ext = att.ext === 'jpg' ? 'jpeg' : att.ext
        content.push({ type: 'image', source: { type: 'base64', media_type: `image/${ext}`, data: att.base64 } })
      } else if (att.text) {
        content.push({ type: 'text', text: `[文件: ${att.name}]\n${att.text}` })
      } else {
        content.push({ type: 'text', text: `[文件: ${att.name}（二进制，已跳过内容）]` })
      }
    }
    if (m.content) content.push({ type: 'text', text: m.content })
    return { role: 'user', content }
  })
}

// 把前端消息格式转成 OpenAI messages 格式（支持附件）
function toOpenAIMessages(messages, system) {
  const result = [{ role: 'system', content: system }]
  for (const m of messages) {
    if (m.role !== 'user' || !m.attachments?.length) {
      result.push({ role: m.role, content: m.content })
      continue
    }
    const parts = []
    for (const att of m.attachments) {
      if (att.isImage && att.base64) {
        const ext = att.ext === 'jpg' ? 'jpeg' : att.ext
        parts.push({ type: 'image_url', image_url: { url: `data:image/${ext};base64,${att.base64}` } })
      } else if (att.text) {
        parts.push({ type: 'text', text: `[文件: ${att.name}]\n${att.text}` })
      } else {
        parts.push({ type: 'text', text: `[文件: ${att.name}（二进制，已跳过内容）]` })
      }
    }
    if (m.content) parts.push({ type: 'text', text: m.content })
    result.push({ role: 'user', content: parts })
  }
  return result
}

async function agentLoopAnthropic(provider, messages, signal, cwd) {
  const client = await resolveAnthropicClient(provider)
  const modelId = resolveModel(provider)

  const SYSTEM = buildSystemPrompt(cwd)
  let msgs = toAnthropicMessages(messages)
  let toolsSupported = true // 首次尝试带 tools，失败则降级

  for (let turn = 0; turn < 50; turn++) {
    if (signal.aborted) break

    const assistantContent = []
    let currentText = ''

    const reqParams = {
      model: modelId,
      max_tokens: 8096,
      system: SYSTEM,
      messages: msgs,
    }
    if (toolsSupported) reqParams.tools = TOOL_DEFINITIONS

    const stream = client.messages.stream(reqParams)

    let streamErr = null
    for await (const event of stream.on('error', e => { streamErr = e })) {
      if (signal.aborted) break

      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'text') {
          currentText = ''
        } else if (event.content_block.type === 'tool_use') {
          if (currentText) {
            assistantContent.push({ type: 'text', text: currentText })
            currentText = ''
          }
          assistantContent.push({
            type: 'tool_use',
            id: event.content_block.id,
            name: event.content_block.name,
            input: {},
            _inputRaw: '',
          })
        }
      } else if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          currentText += event.delta.text
          send('chat:chunk', { type: 'text', text: event.delta.text })
        } else if (event.delta.type === 'input_json_delta') {
          const last = assistantContent[assistantContent.length - 1]
          if (last?.type === 'tool_use') last._inputRaw += event.delta.partial_json
        }
      } else if (event.type === 'content_block_stop') {
        const last = assistantContent[assistantContent.length - 1]
        if (last?.type === 'tool_use') {
          try { last.input = JSON.parse(last._inputRaw || '{}') } catch { last.input = {} }
          delete last._inputRaw
        }
      } else if (event.type === 'message_stop') {
        if (currentText) {
          assistantContent.push({ type: 'text', text: currentText })
          currentText = ''
        }
      }
    }

    if (signal.aborted) break

    // 若流报错且还没降级，则关闭 tools 重试本轮
    if (streamErr && toolsSupported && assistantContent.length === 0 && currentText === '') {
      toolsSupported = false
      send('chat:chunk', { type: 'text', text: '' }) // 触发 streaming 光标显示
      continue
    }

    // 把末尾残留文本收进去
    if (currentText) {
      assistantContent.push({ type: 'text', text: currentText })
      currentText = ''
    }

    const toolUses = assistantContent.filter(b => b.type === 'tool_use')
    if (toolUses.length === 0) break // 无工具调用，对话结束

    // 把 assistant message 加进去
    msgs = [...msgs, { role: 'assistant', content: assistantContent }]

    const toolResults = []
    for (const tu of toolUses) {
      send('chat:tool_start', { name: tu.name, input: tu.input })
      const result = await executeTool(tu.name, tu.input, cwd)
      send('chat:tool_end', { name: tu.name, result })
      toolResults.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: JSON.stringify(result),
      })
    }

    msgs = [...msgs, { role: 'user', content: toolResults }]
  }
}

// ─── OpenAI Agent Loop ────────────────────────────────────────────────────────

async function agentLoopOpenAI(provider, messages, signal, cwd) {
  const OpenAI = require('openai')
  const env = resolveEnv(provider)
  const agent = await getProxyAgent()
  const clientOpts = {
    apiKey: env.ANTHROPIC_API_KEY || env.OPENAI_API_KEY || 'dummy',
    baseURL: env.ANTHROPIC_BASE_URL || env.OPENAI_BASE_URL,
  }
  if (agent) clientOpts.httpAgent = agent
  const client = new OpenAI.default(clientOpts)
  const modelId = resolveModel(provider)

  const SYSTEM = buildSystemPrompt(cwd)

  const functions = TOOL_DEFINITIONS.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }))

  let msgs = toOpenAIMessages(messages, SYSTEM)
  let toolsSupported = true

  for (let turn = 0; turn < 50; turn++) {
    if (signal.aborted) break

    const reqParams = { model: modelId, messages: msgs, stream: true }
    if (toolsSupported) reqParams.tools = functions

    let stream
    try {
      stream = await client.chat.completions.create(reqParams, { signal })
    } catch (err) {
      if (toolsSupported && (err.message?.includes('chunk') || err.status >= 400)) {
        toolsSupported = false
        continue
      }
      throw err
    }

    let fullContent = ''
    const toolCallMap = {}
    let streamFailed = false

    try {
    for await (const chunk of stream) {
      if (signal.aborted) break
      const delta = chunk.choices[0]?.delta
      if (!delta) continue

      if (delta.content) {
        fullContent += delta.content
        send('chat:chunk', { type: 'text', text: delta.content })
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (!toolCallMap[tc.index]) {
            toolCallMap[tc.index] = { id: tc.id, name: tc.function?.name ?? '', args: '' }
          }
          if (tc.id) toolCallMap[tc.index].id = tc.id
          if (tc.function?.name) toolCallMap[tc.index].name += tc.function.name
          if (tc.function?.arguments) toolCallMap[tc.index].args += tc.function.arguments
        }
      }
    }
    } catch (err) {
      if (toolsSupported && fullContent === '' && Object.keys(toolCallMap).length === 0) {
        toolsSupported = false
        continue
      }
      throw err
    }

    if (signal.aborted) break

    const toolCalls = Object.values(toolCallMap)
    if (toolCalls.length === 0) break

    msgs = [...msgs, {
      role: 'assistant',
      content: fullContent || null,
      tool_calls: toolCalls.map(tc => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: tc.args },
      })),
    }]

    for (const tc of toolCalls) {
      let input = {}
      try { input = JSON.parse(tc.args || '{}') } catch {}
      send('chat:tool_start', { name: tc.name, input })
      const result = await executeTool(tc.name, input, cwd)
      send('chat:tool_end', { name: tc.name, result })
      msgs = [...msgs, {
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      }]
    }
  }
}

function buildSystemPrompt(cwd) {
  return `You are an AI assistant with access to tools that let you interact with the user's computer. You can read/write files, run shell commands, search code, and more.

Current working directory: ${cwd}
OS: ${process.platform}
Home directory: ${os.homedir()}

When using tools:
- For bash commands, prefer short targeted commands
- When editing files, always read them first to understand the content
- Report what you're doing as you go

Be direct and efficient. Complete tasks with the minimum necessary tool calls.`
}

module.exports = { setupChatHandlers }
