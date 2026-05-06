# Multi-ZCL

> AI 多模型配置管理 + 内置 Agent 对话桌面工具

基于 Electron + React 构建的桌面应用。支持多套 AI 模型配置独立隔离、一键切换，内置完整 Agent Loop，可调用文件读写、命令执行、代码搜索等工具，并支持技能（Skills）扩展。

---

## 功能特性

### 模型配置管理
- **多 Provider 隔离** — 每套配置（API Key、Base URL、模型 ID、环境变量）独立存储，互不干扰
- **一键激活** — 激活即写入 `~/.claude/settings.json`，Claude CLI 立即生效
- **丰富预设** — 内置 Claude、DeepSeek、GLM、MiniMax、Qwen、Kimi 等主流模型预设

### Agent 对话
- **完整 Agent Loop** — 支持多轮工具调用（bash、读写文件、glob、grep），自动处理工具结果并继续推理
- **多轮对话记忆** — 后端缓存完整对话历史（含工具调用结果），下一轮无需重新读取文件
- **技能（Skills）支持** — 自动读取 `~/.claude/skills/` 中已安装的技能，任务匹配时优先使用
- **流式输出** — 实时渲染 Markdown、代码块、表格；等待状态时在消息气泡内显示进度提示
- **智能自动滚动** — 流式输出时跟随滚动；用户上滑阅读时自动暂停，滚回底部后恢复

### 附件与文件
- **多种附件类型** — 支持图片、视频、文本、Office 文件（Excel / Word / PPT）拖拽、粘贴、选择上传
- **文件一键打开** — 模型生成的文件路径自动识别，点击「打开文件」用系统默认程序打开
- **HTML 内嵌预览** — HTML 代码块右上角提供「预览」按钮，直接在对话中渲染查看
- **截图粘贴** — 支持 `Ctrl+V` 直接粘贴截图作为附件

### 对话体验
- **消息队列** — 流式运行中发送的消息自动排队，完成后依次执行，不丢失
- **多会话管理** — 侧边栏管理对话历史，支持新建、切换、删除，localStorage 本地持久化
- **工作目录选择** — 支持浏览选择或手动输入工作目录，默认 `~/claude`（自动创建），可重置
- **中文输入法兼容** — 正确处理 IME 合成状态，拼音输入时回车不会误发消息

### 技能市场
- **浏览与安装** — 内置技能市场（skillhub.cn），按分类/关键词搜索，一键安装
- **卸载管理** — 已安装技能支持二次确认卸载，直接删除本地目录

---

## 支持的模型预设

| 预设名称 | SDK 类型 | 说明 |
|---|---|---|
| Claude-wrok | Anthropic | 自定义 BaseURL 中转代理 |
| AWS Bedrock | Anthropic | AWS 官方 Bedrock 直连 |
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
- **AI SDK** — @anthropic-ai/sdk · @aws-sdk/client-bedrock-runtime · openai
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

### 本地打包

```bash
# macOS（DMG）
npm run dist:mac

# Windows（portable + zip）
npm run dist:win
```

产物输出到 `release/` 目录。

```bash
npm run clean        # 清除 dist + release
npm run clean:all    # 清除 dist + release + node_modules
```

---

## 使用说明

1. **添加配置** — 左侧齿轮图标 → 添加模型配置 → 选择预设或手动填写
2. **激活配置** — Provider 列表点击「激活」，自动写入 `~/.claude/settings.json`
3. **开始对话** — 点击左侧对话图标，在输入框发送消息
4. **发送附件** — 点击输入框左侧 📎，或拖拽文件到对话区，或粘贴截图
5. **设置工作目录** — 点击顶栏 📁 按钮，可浏览选择目录或手动输入，默认为 `~/claude`
6. **安装技能** — 左侧标签图标进入技能市场，搜索安装；已安装技能可在详情页卸载
7. **新建对话** — 侧边栏点击 + 按钮，或 `Ctrl+N` / `Cmd+N`

---

## 配置文件位置

| 文件 | 说明 |
|---|---|
| `~/.cc-gateway/providers.json` | Provider 配置存储 |
| `~/.claude/settings.json` | Claude CLI 配置（激活时自动写入） |
| `~/.claude/skills/` | 已安装的技能目录 |
| `~/claude/` | 默认工作目录（自动创建） |

---

## 快捷键

| 快捷键 | 功能 |
|---|---|
| `Ctrl/Cmd + N` | 新建对话 |
| `Ctrl/Cmd + O` | 导入附件 |
| `Enter` | 发送消息 |
| `Shift + Enter` | 消息换行 |

---

## License

MIT — Developed by ZCL
