import { create } from "zustand"
import { backend, type Backend } from "./api"
import type { User } from "./types"

interface Session {
  user: User | null
  api: Backend | null
  ready: boolean
  init: () => Promise<void>
  setUser: (user: User | null) => void
  logout: () => Promise<void>
}

export const useSession = create<Session>((set, get) => ({
  user: null,
  api: null,
  ready: false,
  init: async () => {
    if (get().ready) return
    const api = await backend()
    let user: User | null = null
    try {
      user = await api.me()
    } catch {
      user = null
    }
    set({ api, user, ready: true })
  },
  setUser: (user) => set({ user }),
  logout: async () => {
    await get().api?.logout()
    set({ user: null })
  },
}))
