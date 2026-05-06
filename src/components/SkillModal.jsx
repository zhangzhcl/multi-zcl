import { useState } from 'react'

export default function SkillModal({ skill, isInstalled, onClose, onInstall }) {
  const [installing, setInstalling] = useState(false)
  const [output, setOutput] = useState('')

  const handleInstall = async () => {
    setInstalling(true)
    setOutput('正在安装...\n')
    try {
      const result = await onInstall()
      setOutput(prev => prev + result.stdout + '\n')
      if (result.stderr) {
        setOutput(prev => prev + '错误: ' + result.stderr + '\n')
      }
      setOutput(prev => prev + '\n✓ 安装完成！')
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setOutput(prev => prev + '✗ 安装失败: ' + err.message + '\n')
    } finally {
      setInstalling(false)
    }
  }

  const installCommand = `npx skills add clawhub.ai/${skill.ownerName}/${skill.slug} -g -y`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white mb-1">{skill.name}</h2>
              <p className="text-sm text-slate-500">by {skill.ownerName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 统计信息 */}
          <div className="flex items-center gap-4 mt-4 text-sm">
            <span className="flex items-center gap-1.5 text-slate-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              {skill.installs?.toLocaleString() || 0} 安装
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {skill.stars || 0} 星标
            </span>
            {skill.version && (
              <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded">v{skill.version}</span>
            )}
          </div>
        </div>

        {/* 内容区 */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <p className="text-slate-300 mb-4">{skill.description_zh}</p>

          {/* 安装命令 */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-slate-400 mb-2">安装命令：</h3>
            <code className="block bg-slate-950 px-3 py-2 rounded-lg text-xs text-slate-300 break-all">
              {installCommand}
            </code>
          </div>

          {/* 安装输出 */}
          {output && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-slate-400 mb-2">安装输出：</h3>
              <pre className="bg-slate-950 px-3 py-2 rounded-lg text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap">
                {output}
              </pre>
            </div>
          )}

          {/* 标签 */}
          {skill.tags && Object.keys(skill.tags).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.keys(skill.tags).map(tag => (
                <span key={tag} className="px-2 py-1 bg-slate-800 text-slate-400 text-xs rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            disabled={installing}
          >
            关闭
          </button>
          {!isInstalled && (
            <button
              onClick={handleInstall}
              disabled={installing}
              className={`px-4 py-2 rounded-lg transition-colors ${
                installing
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {installing ? '安装中...' : '安装技能'}
            </button>
          )}
          {isInstalled && (
            <span className="px-4 py-2 bg-green-900/50 text-green-400 rounded-lg">
              ✓ 已安装
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
