import { create } from 'zustand'
import { createContext, useContext } from 'react'

const Ctx = createContext(null)

export const SkillsStore = ({ children }) => {
  const store = useSkillsStore()
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export const useSkills = () => {
  const store = useContext(Ctx)
  if (!store) throw new Error('useSkills must be used within SkillsStore')
  return store
}

const useSkillsStore = create((set, get) => ({
  installed: [],
  skills: [],
  loading: false,
  category: 'all',
  query: '',
  page: 1,
  total: 0,

  fetchInstalled: async () => {
    const list = await window.api.skills.list()
    set({ installed: list })
  },

  fetchSkills: async () => {
    const { category, query, page } = get()
    set({ loading: true })
    try {
      const data = await window.api.skills.fetch(category, query, page)
      set({ skills: data.skills, total: data.total, loading: false })
    } catch (err) {
      console.error('Failed to fetch skills:', err)
      set({ skills: [], total: 0, loading: false })
    }
  },

  setCategory: (cat) => {
    set({ category: cat, page: 1 })
    get().fetchSkills()
  },

  setQuery: (q) => {
    set({ query: q, page: 1 })
    get().fetchSkills()
  },

  setPage: (p) => {
    set({ page: p })
    get().fetchSkills()
  },

  install: async (ownerName, slug) => {
    return await window.api.skills.install(ownerName, slug)
  },

  uninstall: async (slug) => {
    return await window.api.skills.uninstall(slug)
  },

  isInstalled: (slug) => {
    return get().installed.some(s => s.slug === slug)
  }
}))
