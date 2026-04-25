# Multi-ZCL

> 模型多配置管理工具 — 本地多环境隔离 · 独立配置 · 快速切换

一款基于 Electron + React 的桌面应用，专为需要同时管理多个 AI 模型配置的开发者设计。支持 Claude、DeepSeek、GLM、MiniMax、Qwen、Kimi 等主流模型，一键激活、秒级切换，告别手动改配置文件的烦恼。

---

## 功能特性

- **多 Provider 管理** — 独立存储每套配置（API Key、Base URL、模型 ID、环境变量），互不干扰
- **一键激活** — 激活即写入 `~/.claude/settings.json`，Claude CLI 立即生效
- **内置对话** — 完整 Agent Loop，支持工具调用（读写文件、执行命令、代码搜索等）
- **附件上传** — 对话中可发送图片、视频、文本、Office 文件（Excel / Word / PPT）
- **多会话历史** — 侧边栏管理对话记录，localStorage 本地持久化
- **流式输出** — 实时渲染 Markdown 与代码块，工具调用状态实时展示
- **双 SDK 支持** — Anthropic 原生 SDK + OpenAI 兼容模式，覆盖所有主流代理

---

## 支持的模型预设

| 预设名称 | SDK 类型 | 说明 |
|---|---|---|
| Claude 三方代理 | Anthropic | 自定义 BaseURL 中转 |
| AWS Bedrock | Anthropic | AWS 官方 Bedrock 接入 |
| DeepSeek (Anthropic) | Anthropic | DeepSeek Anthropic 兼容端点 |
| DeepSeek (OpenAI) | OpenAI | DeepSeek OpenAI 兼容端点 |
| GLM Anthropic | Anthropic | 智谱 AI Anthropic 兼容端点 |
| GLM (OpenAI) | OpenAI | 智谱 AI OpenAI 兼容端点 |
| MiniMax (Anthropic) | Anthropic | MiniMax Anthropic 兼容端点 |
| MiniMax (OpenAI) | OpenAI | MiniMax OpenAI 兼容端点 |
| Qwen Coding Plan | OpenAI | 阿里云百炼 Coding Plan |
| Qwen (OpenAI) | OpenAI | 阿里云百炼通用端点 |
| Kimi (OpenAI) | OpenAI | Moonshot AI OpenAI 兼容端点 |

---

## 技术栈

- **前端** — React 18 + Vite 5 + Tailwind CSS 3
- **桌面** — Electron 41
- **AI SDK** — @anthropic-ai/sdk + openai
- **数据持久化** — `~/.cc-gateway/providers.json`（配置）+ localStorage（会话历史）

---

## 快速开始

### 环境要求

- Node.js 18+
- npm 9+

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 打包构建

```bash
# Windows（portable + zip）
npm run dist:win

# macOS（dmg）
npm run dist:mac
```

产物输出到 `release/` 目录。

---

## 使用说明

1. **添加配置** — 点击左侧齿轮图标 → 添加 Provider → 选择预设或手动填写
2. **激活配置** — 在 Provider 列表点击「激活」，自动写入 `~/.claude/settings.json`
3. **开始对话** — 点击左侧对话图标，在输入框发送消息
4. **发送附件** — 点击输入框左侧 📎 按钮，或菜单栏「文件 → 导入附件」
5. **新建对话** — 侧边栏点击 + 按钮，或 `Ctrl+N`
6. **切换会话** — 点击左侧历史记录中的任意对话

---

## 配置文件位置

| 文件 | 说明 |
|---|---|
| `~/.cc-gateway/providers.json` | Provider 配置存储 |
| `~/.claude/settings.json` | Claude CLI 配置（激活时自动写入） |

---

## 快捷键

| 快捷键 | 功能 |
|---|---|
| `Ctrl+N` | 新建对话 |
| `Ctrl+O` | 导入附件 |
| `Enter` | 发送消息 |
| `Shift+Enter` | 消息换行 |

---

## License

MIT — Developed by ZCL
