import { Link } from "react-router"
import { Copy, ExternalLink, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@aledobe/ui"
import type { FileMeta } from "../../lib/types"
import { timeAgo } from "../../lib/time"

interface Props {
  file: FileMeta
  projectName?: string
  onRename: () => void
  onDuplicate: () => void
  onDelete: () => void
}

export function FileCard({ file, projectName, onRename, onDuplicate, onDelete }: Props) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/[0.07] bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_12px_40px_-12px_rgb(168_85_247/0.45)]">
      <Link to={`/file/${file.id}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-[#1a1726]">
          {file.thumbnail ? (
            <img
              src={file.thumbnail}
              alt=""
              className="size-full object-contain p-3 transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-grid">
              <div className="size-14 rounded-xl bg-gradient-to-br from-violet-500/40 to-fuchsia-500/30 ring-1 ring-white/10" />
            </div>
          )}
        </div>
        <div className="border-t border-white/[0.06] px-3.5 py-3">
          <div className="truncate pr-8 text-sm font-medium">{file.name}</div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {projectName ? `${projectName} · ` : ""}Edited {timeAgo(file.updatedAt)}
          </div>
        </div>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="absolute right-2 bottom-3 flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/10 hover:text-foreground data-[state=open]:opacity-100"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to={`/file/${file.id}`}>
              <ExternalLink /> Open
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onRename}>
            <Pencil /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onDuplicate}>
            <Copy /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
