import { useState, useEffect } from 'react'
import { useSkills } from '../store/skills'
import SkillCard from '../components/SkillCard'
import SkillModal from '../components/SkillModal'

const CATEGORIES = [
  { id: 'all', name: '全部' },
  { id: 'ai-intelligence', name: 'AI智能' },
  { id: 'developer-tools', name: '开发工具' },
  { id: 'productivity', name: '效率提升' },
  { id: 'data-analysis', name: '数据分析' },
  { id: 'content-creation', name: '内容创作' },
  { id: 'security-compliance', name: '安全合规' },
  { id: 'communication-collaboration', name: '通讯协作' }
]

export default function SkillsPage() {
  const {
    skills, loading, category, query, page, total,
    fetchInstalled, fetchSkills, setCategory, setQuery, setPage, install, uninstall, isInstalled
  } = useSkills()

  const [selectedSkill, setSelectedSkill] = useState(null)

  useEffect(() => {
    fetchInstalled()
    fetchSkills()
  }, [])

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* 左侧分类 */}
      <div className="w-48 border-r border-slate-700 p-4 overflow-y-auto bg-slate-900 shrink-0">
        <h2 className="text-sm font-semibold text-slate-400 mb-3">分类</h2>
        <div className="space-y-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                category === cat.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* 右侧内容 */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* 风险提示 */}
        <div className="mb-4 px-4 py-3 bg-amber-950/30 border border-amber-700/50 rounded-lg">
          <p className="text-xs text-amber-200">
            ⚠️ 当前技能来源于腾讯技能市场（skillhub.cn），请注意识别风险，内容版权归原作者所有。本站部分技能由用户提供，使用前请自行评估安全性。
          </p>
        </div>

        {/* 搜索框 */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="搜索技能..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full max-w-md px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* 技能列表 */}
        {loading ? (
          <div className="text-center text-slate-500 py-12">加载中...</div>
        ) : skills.length === 0 ? (
          <div className="text-center text-slate-500 py-12">
            <div className="text-4xl mb-3">🔍</div>
            <p>未找到相关技能</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {skills.map(skill => (
                <SkillCard
                  key={skill.slug}
                  skill={skill}
                  isInstalled={isInstalled(skill.slug)}
                  onClick={() => setSelectedSkill(skill)}
                />
              ))}
            </div>

            {/* 分页 */}
            {total > 24 && (
              <div className="flex justify-center gap-2">
                {Array.from({ length: Math.ceil(total / 24) }, (_, i) => i + 1).slice(0, 10).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1 rounded transition-colors ${
                      page === p
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 技能详情弹窗 */}
      {selectedSkill && (
        <SkillModal
          skill={selectedSkill}
          isInstalled={isInstalled(selectedSkill.slug)}
          onClose={() => setSelectedSkill(null)}
          onInstall={async () => {
            await install(selectedSkill.ownerName, selectedSkill.slug)
            await fetchInstalled()
            setSelectedSkill(null)
          }}
          onUninstall={async () => {
            await uninstall(selectedSkill.slug)
            await fetchInstalled()
            setSelectedSkill(null)
          }}
        />
      )}
    </div>
  )
}
