import { create } from "zustand"
import { api, apiAvailable, type Backend } from "./api"
import type { User } from "./types"

interface Session {
  user: User | null
  api: Backend
  available: boolean
  ready: boolean
  init: () => Promise<void>
  setUser: (user: User | null) => void
  logout: () => Promise<void>
}

export const useSession = create<Session>((set, get) => ({
  user: null,
  api,
  available: true,
  ready: false,
  init: async () => {
    if (get().ready) return
    const available = await apiAvailable()
    let user: User | null = null
    if (available) {
      try {
        user = await api.me()
      } catch {
        user = null
      }
    }
    set({ available, user, ready: true })
  },
  setUser: (user) => set({ user }),
  logout: async () => {
    await get().api.logout()
    set({ user: null })
  },
}))
