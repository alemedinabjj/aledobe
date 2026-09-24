import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, NavLink, useNavigate, useParams, useSearchParams } from "react-router"
import {
  Clock,
  Folder,
  FolderPlus,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  CreditCard,
  LayoutGrid,
} from "lucide-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  ScrollArea,
  toast,
} from "@aledobe/ui"
import { Logo } from "../components/Logo"
import { FileCard } from "../components/dashboard/FileCard"
import { PromptDialog } from "../components/dashboard/PromptDialog"
import { UpgradeDialog } from "../components/dashboard/UpgradeDialog"
import { useSession } from "../lib/session"
import type { FileMeta, Project } from "../lib/types"

type Prompt =
  | { kind: "new-project" }
  | { kind: "rename-project"; project: Project }
  | { kind: "rename-file"; file: FileMeta }
  | null

export default function Dashboard() {
  const { projectId } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { api, user, logout } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [files, setFiles] = useState<FileMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [prompt, setPrompt] = useState<Prompt>(null)
  const [upgrade, setUpgrade] = useState(params.get("upgrade") === "pro")

  const project = projects.find((p) => p.id === projectId)

  const refresh = useCallback(async () => {
    if (!api) return
    try {
      const [ps, fs] = await Promise.all([api.listProjects(), projectId ? api.listFiles(projectId) : api.recentFiles()])
      setProjects(ps)
      setFiles(fs)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [api, projectId])

  useEffect(() => {
    setLoading(true)
    refresh()
  }, [refresh])

  useEffect(() => {
    const billing = params.get("billing")
    if (billing === "success") toast.success("Welcome to Pro! Your subscription is active.")
    if (billing === "cancel") toast("Checkout canceled.")
    if (billing) {
      params.delete("billing")
      setParams(params, { replace: true })
    }
  }, [params, setParams])

  const projectNames = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p.name])), [projects])
  const visible = files.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))

  const newFile = async () => {
    if (!api) return
    try {
      let target = projectId ?? projects[0]?.id
      if (!target) target = (await api.createProject("My first project")).id
      const f = await api.createFile(target, "Untitled")
      navigate(`/file/${f.id}`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const onPrompt = async (value: string) => {
    if (!api || !prompt) return
    try {
      if (prompt.kind === "new-project") {
        const p = await api.createProject(value)
        navigate(`/dashboard/projects/${p.id}`)
      } else if (prompt.kind === "rename-project") await api.updateProject(prompt.project.id, { name: value })
      else if (prompt.kind === "rename-file") await api.updateFile(prompt.file.id, { name: value })
      await refresh()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const initials = (user?.name ?? "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-64 shrink-0 flex-col border-r border-white/[0.06] bg-panel">
        <div className="flex h-14 items-center px-4">
          <Link to="/">
            <Logo />
          </Link>
        </div>
        <div className="px-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files"
              className="h-8 border-transparent bg-white/[0.04] pl-8 text-[13px]"
            />
          </div>
        </div>
        <nav className="mt-4 flex flex-col gap-0.5 px-2 text-[13px]">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              cn(
                "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                isActive && "bg-primary/15 text-foreground",
              )
            }
          >
            <Clock className="size-4" /> Recents
          </NavLink>
        </nav>
        <div className="mt-6 flex items-center justify-between px-4 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Projects
          <button
            type="button"
            onClick={() => setPrompt({ kind: "new-project" })}
            className="flex size-6 items-center justify-center rounded-md hover:bg-white/[0.06] hover:text-foreground"
            title="New project"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
        <ScrollArea className="mt-1 min-h-0 flex-1 px-2">
          {projects.map((p) => (
            <div key={p.id} className="group relative">
              <NavLink
                to={`/dashboard/projects/${p.id}`}
                className={({ isActive }) =>
                  cn(
                    "flex h-8 items-center gap-2.5 rounded-md px-2.5 pr-8 text-[13px] text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                    isActive && "bg-primary/15 text-foreground",
                  )
                }
              >
                <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: p.color }} />
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-[11px] tabular-nums opacity-60 group-hover:opacity-0">{p.fileCount}</span>
              </NavLink>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-white/10 data-[state=open]:opacity-100"
                  >
                    <MoreHorizontal className="size-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onSelect={() => setPrompt({ kind: "rename-project", project: p })}>
                    <Pencil /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={async () => {
                      if (!api || !confirm(`Delete "${p.name}" and all its files?`)) return
                      await api.deleteProject(p.id)
                      if (projectId === p.id) navigate("/dashboard")
                      refresh()
                    }}
                  >
                    <Trash2 /> Delete project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
          {!projects.length && !loading && (
            <button
              type="button"
              onClick={() => setPrompt({ kind: "new-project" })}
              className="mx-1 mt-1 flex w-[calc(100%-8px)] items-center gap-2 rounded-md border border-dashed border-white/10 px-2.5 py-2 text-[12px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
            >
              <FolderPlus className="size-4" /> Create a project
            </button>
          )}
        </ScrollArea>
        <div className="border-t border-white/[0.06] p-3">
          {user?.plan !== "pro" && (
            <button
              type="button"
              onClick={() => setUpgrade(true)}
              className="mb-3 w-full rounded-xl border border-primary/30 bg-gradient-to-br from-violet-600/25 to-fuchsia-600/10 p-3 text-left transition-colors hover:border-primary/60"
            >
              <div className="flex items-center gap-2 text-[13px] font-semibold">
                <Sparkles className="size-4 text-neon" /> Go Pro
              </div>
              <p className="mt-1 text-[12px] text-muted-foreground">Unlimited projects and version history.</p>
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-white/[0.04]">
              <Avatar className="size-8">
                {user?.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">{user?.name}</div>
                <div className="truncate text-[11px] text-muted-foreground">{user?.email}</div>
              </div>
              {user?.plan === "pro" && <Badge variant="neon">Pro</Badge>}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56">
              <DropdownMenuLabel>
                {api?.mode === "local" ? "Guest workspace (this browser)" : "Account"}
              </DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => setUpgrade(true)}>
                <CreditCard /> {user?.plan === "pro" ? "Manage billing" : "Upgrade to Pro"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={async () => {
                  await logout()
                  navigate("/")
                }}
              >
                <LogOut /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] px-8">
          <div className="flex items-center gap-2.5">
            {project ? (
              <>
                <Folder className="size-4 text-muted-foreground" />
                <h1 className="font-semibold">{project.name}</h1>
              </>
            ) : (
              <>
                <LayoutGrid className="size-4 text-muted-foreground" />
                <h1 className="font-semibold">Recents</h1>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPrompt({ kind: "new-project" })}>
              <FolderPlus /> New project
            </Button>
            <Button size="sm" onClick={newFile}>
              <Plus /> New design
            </Button>
          </div>
        </header>
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-8">
            {!project && (
              <div className="mb-10 grid gap-4 sm:grid-cols-3">
                {[
                  { title: "New design file", text: "Start from a blank canvas", action: newFile, icon: Plus },
                  {
                    title: "New project",
                    text: "Organise files for a client or product",
                    action: () => setPrompt({ kind: "new-project" }),
                    icon: FolderPlus,
                  },
                  {
                    title: "Playground",
                    text: "Explore the sample file",
                    action: () => navigate("/playground"),
                    icon: Sparkles,
                  },
                ].map((c) => (
                  <button
                    key={c.title}
                    type="button"
                    onClick={c.action}
                    className="group flex items-center gap-4 rounded-xl border border-white/[0.07] bg-card p-4 text-left transition-colors hover:border-primary/40"
                  >
                    <span className="flex size-11 items-center justify-center rounded-lg bg-primary/15 text-neon ring-1 ring-primary/30 transition-transform group-hover:scale-105">
                      <c.icon className="size-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{c.title}</span>
                      <span className="block text-xs text-muted-foreground">{c.text}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-[16/12] animate-pulse rounded-xl bg-white/[0.03]" />
                ))}
              </div>
            ) : visible.length ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visible.map((f) => (
                  <FileCard
                    key={f.id}
                    file={f}
                    projectName={projectId ? undefined : projectNames[f.projectId]}
                    onRename={() => setPrompt({ kind: "rename-file", file: f })}
                    onDuplicate={async () => {
                      await api?.duplicateFile(f.id)
                      refresh()
                    }}
                    onDelete={async () => {
                      if (!confirm(`Delete "${f.name}"?`)) return
                      await api?.deleteFile(f.id)
                      refresh()
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-24 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-neon ring-1 ring-primary/30">
                  <LayoutGrid className="size-6" />
                </div>
                <h2 className="mt-5 font-semibold">{query ? "No files match your search" : "No files yet"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Create your first design file to get started.</p>
                <Button className="mt-6" onClick={newFile}>
                  <Plus /> New design
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </main>

      <PromptDialog
        open={!!prompt}
        onOpenChange={(v) => !v && setPrompt(null)}
        title={prompt?.kind === "new-project" ? "New project" : "Rename"}
        confirm={prompt?.kind === "new-project" ? "Create" : "Save"}
        initial={
          prompt?.kind === "rename-project"
            ? prompt.project.name
            : prompt?.kind === "rename-file"
              ? prompt.file.name
              : "Untitled project"
        }
        onSubmit={onPrompt}
      />
      <UpgradeDialog
        open={upgrade}
        onOpenChange={(v) => {
          setUpgrade(v)
          if (!v && params.get("upgrade")) {
            params.delete("upgrade")
            setParams(params, { replace: true })
          }
        }}
      />
    </div>
  )
}
