import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function MessageBubble({ message, thinking }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
      {/* 附件预览（用户消息） */}
      {isUser && message.attachments?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 max-w-[85%] justify-end">
          {message.attachments.map((att, i) => (
            att.isImage && att.base64
              ? <img key={i} src={`data:image/${att.ext === 'jpg' ? 'jpeg' : att.ext};base64,${att.base64}`}
                  alt={att.name} className="max-w-[200px] max-h-[150px] rounded-lg border border-slate-700 object-cover" />
              : <div key={i} className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300">
                  <span className="text-slate-400">📎</span>
                  <span>{att.name}</span>
                </div>
          ))}
        </div>
      )}

      {/* Thinking 指示器 */}
      {thinking && (
        <div className="flex items-center gap-1.5 px-1 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          <span className="text-xs text-indigo-400 animate-pulse ml-0.5">Thinking...</span>
        </div>
      )}

      {/* 工具调用展示（只在 assistant 消息中） */}
      {!isUser && message.toolCalls?.length > 0 && (
        <div className="w-full max-w-[85%] space-y-1.5">
          {message.toolCalls.map(tc => (
            <ToolCallCard key={tc.id} toolCall={tc} />
          ))}
        </div>
      )}

      {/* 文本内容 */}
      {(message.content || message.streaming) && (
        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-600 text-white rounded-br-sm'
            : message.error
              ? 'bg-red-950 border border-red-800 text-red-300 rounded-bl-sm'
              : message.waiting
                ? 'bg-slate-900 border border-slate-700 border-dashed text-slate-500 rounded-bl-sm'
                : 'bg-slate-800 text-slate-200 rounded-bl-sm'
        }`}>
          {isUser
            ? <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
            : <MarkdownContent content={message.content} />
          }
          {message.streaming && !message.content && (
            <span className="inline-block w-1.5 h-4 bg-slate-400 animate-pulse rounded-sm" />
          )}
          {message.streaming && message.content && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-current opacity-70 animate-pulse rounded-sm" />
          )}
        </div>
      )}
    </div>
  )
}

function ToolCallCard({ toolCall }) {
  const [expanded, setExpanded] = useState(false)
  const isRunning = toolCall.status === 'running'

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 overflow-hidden text-xs">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-800 transition-colors"
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isRunning ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`} />
        <span className="text-slate-400 font-mono">{isRunning ? '执行中 · ' : '完成 · '}{toolCall.name}</span>
        <span className="text-slate-600 truncate flex-1">
          {Object.entries(toolCall.input || {}).map(([k, v]) => `${k}=${JSON.stringify(v).slice(0, 40)}`).join(' ')}
        </span>
        <span className="text-slate-600 shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-3 pb-2 space-y-2 border-t border-slate-800">
          <div>
            <div className="text-slate-500 mb-1 mt-2">输入参数</div>
            <pre className="text-slate-300 bg-slate-950 rounded p-2 overflow-x-auto text-xs">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>
          {toolCall.result && (
            <div>
              <div className="text-slate-500 mb-1">执行结果</div>
              <pre className="text-slate-300 bg-slate-950 rounded p-2 overflow-x-auto text-xs max-h-60">
                {typeof toolCall.result === 'string'
                  ? toolCall.result
                  : JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MarkdownContent({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="text-lg font-bold text-slate-100 mt-3 mb-1">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-bold text-slate-100 mt-3 mb-1">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-200 mt-2 mb-1">{children}</h3>,
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-slate-100">{children}</strong>,
        em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
        ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-2 pl-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 mb-2 pl-2">{children}</ol>,
        li: ({ children }) => <li className="text-slate-300">{children}</li>,
        blockquote: ({ children }) => <blockquote className="border-l-2 border-slate-500 pl-3 my-2 text-slate-400 italic">{children}</blockquote>,
        hr: () => <hr className="border-slate-600 my-3" />,
        a: ({ href, children }) => <a href={href} className="text-indigo-400 hover:text-indigo-300 underline" target="_blank" rel="noreferrer">{children}</a>,
        code: ({ inline, className, children }) => {
          if (inline) {
            return <code className="px-1 py-0.5 bg-slate-700 rounded text-xs text-indigo-300 font-mono">{children}</code>
          }
          const lang = (className || '').replace('language-', '')
          return (
            <div className="rounded-lg overflow-hidden my-2">
              {lang && <div className="px-3 py-1 bg-slate-700 text-xs text-slate-400 font-mono">{lang}</div>}
              <pre className="p-3 bg-slate-900 text-slate-300 text-xs overflow-x-auto">
                <code>{children}</code>
              </pre>
            </div>
          )
        },
        table: ({ children }) => <div className="overflow-x-auto my-2"><table className="text-xs border-collapse w-full">{children}</table></div>,
        th: ({ children }) => <th className="border border-slate-600 px-2 py-1 bg-slate-700 text-slate-200 font-medium text-left">{children}</th>,
        td: ({ children }) => <td className="border border-slate-600 px-2 py-1 text-slate-300">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
