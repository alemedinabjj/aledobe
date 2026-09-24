import { createContext, useContext } from "react"

export interface EditorUser {
  name: string
  email?: string
  avatarUrl?: string | null
}

export type SaveStatus = "saved" | "saving" | "unsaved" | "offline" | "error"

export interface EditorHost {
  user?: EditorUser | null
  saveStatus: SaveStatus
  onBack?: () => void
  onRename?: (name: string) => void
  onShare?: () => void
}

export const HostContext = createContext<EditorHost>({ saveStatus: "saved" })
export const useHost = () => useContext(HostContext)
