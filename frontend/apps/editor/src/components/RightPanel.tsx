import { ChevronDown, Share2 } from "lucide-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@aledobe/ui"
import { useEditor } from "../core/store"
import { useHost } from "../host"
import { DesignPanel } from "./design/DesignPanel"
import { CodePanel } from "./design/CodePanel"
import { shift } from "../core/platform"

function ZoomMenu() {
  const zoom = useEditor((s) => s.camera.zoom)
  const s = useEditor.getState
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-7 items-center gap-0.5 rounded-md px-1.5 text-[11px] tabular-nums hover:bg-white/[0.06]">
        {Math.round(zoom * 100)}%<ChevronDown className="size-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={() => s().zoomBy(1.5)}>
          Zoom in<DropdownMenuShortcut>+</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => s().zoomBy(1 / 1.5)}>
          Zoom out<DropdownMenuShortcut>-</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => s().zoomToFit()}>
          Zoom to fit<DropdownMenuShortcut>{shift}1</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => s().zoomToFit(s().selection)} disabled={!s().selection.length}>
          Zoom to selection<DropdownMenuShortcut>{shift}2</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {[0.5, 1, 2].map((z) => (
          <DropdownMenuItem key={z} onSelect={() => s().zoomTo(z)}>
            Zoom to {z * 100}%{z === 1 && <DropdownMenuShortcut>{shift}0</DropdownMenuShortcut>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function RightPanel() {
  const host = useHost()
  const tab = useEditor((s) => s.rightTab)
  const initials = (host.user?.name ?? "You")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-l border-white/[0.06] bg-panel">
      <div className="flex h-12 items-center gap-2 border-b border-white/[0.06] px-3">
        <Avatar className="size-7 ring-2 ring-primary/40">
          {host.user?.avatarUrl && <AvatarImage src={host.user.avatarUrl} />}
          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1" />
        <Button size="xs" variant="default" className="h-7 px-3 text-[11px]" onClick={() => host.onShare?.()}>
          <Share2 className="size-3" /> Share
        </Button>
        <ZoomMenu />
      </div>
      <Tabs
        value={tab}
        onValueChange={(v) => useEditor.getState().set({ rightTab: v as "design" | "code" })}
        className="min-h-0 flex-1 gap-0"
      >
        <div className="border-b border-white/[0.06] px-3 py-2">
          <TabsList className="w-full">
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
          </TabsList>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <TabsContent value="design" className="pb-10">
            <DesignPanel />
          </TabsContent>
          <TabsContent value="code" className="pb-10">
            <CodePanel />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </aside>
  )
}
