import { ArrowLeft, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@aledobe/ui"
import { useEditor } from "../core/store"
import { pickImages } from "../core/images"
import { exportSelection } from "../core/export"
import { alt, mod, shift } from "../core/platform"
import { useHost } from "../host"
import { Logo } from "./Logo"

export function MainMenu() {
  const s = useEditor.getState
  const host = useHost()
  const showPixelGrid = useEditor((st) => st.showPixelGrid)
  const snapping = useEditor((st) => st.snapping)
  const panelsHidden = useEditor((st) => st.panelsHidden)
  const canUndo = useEditor((st) => st.past.length > 0)
  const canRedo = useEditor((st) => st.future.length > 0)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-8 items-center gap-0.5 rounded-lg px-1 hover:bg-white/[0.06] data-[state=open]:bg-white/[0.08]"
        >
          <Logo className="size-6" />
          <ChevronDown className="size-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        {host.onBack && (
          <>
            <DropdownMenuItem onSelect={() => host.onBack?.()}>
              <ArrowLeft /> Back to files
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>File</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-60">
            <DropdownMenuItem onSelect={() => pickImages()}>
              Place image…
              <DropdownMenuShortcut>
                {shift}
                {mod}K
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => exportSelection("png", 2)}>
              Export PNG @2x
              <DropdownMenuShortcut>
                {shift}
                {mod}E
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => exportSelection("svg", 1)}>Export SVG</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => exportSelection("jpg", 1)}>Export JPG</DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                const blob = new Blob([JSON.stringify(s().doc)], { type: "application/json" })
                const a = document.createElement("a")
                a.href = URL.createObjectURL(blob)
                a.download = `${s().doc.name}.aledobe.json`
                a.click()
              }}
            >
              Save local copy (.json)
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                const input = document.createElement("input")
                input.type = "file"
                input.accept = ".json,application/json"
                input.onchange = async () => {
                  const file = input.files?.[0]
                  if (!file) return
                  try {
                    const doc = JSON.parse(await file.text())
                    if (doc?.pages && doc?.nodes) s().load(doc)
                  } catch {
                    return
                  }
                }
                input.click()
              }}
            >
              Open local copy…
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Edit</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56">
            <DropdownMenuItem disabled={!canUndo} onSelect={() => s().undo()}>
              Undo<DropdownMenuShortcut>{mod}Z</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canRedo} onSelect={() => s().redo()}>
              Redo
              <DropdownMenuShortcut>
                {shift}
                {mod}Z
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => s().duplicateSelection()}>
              Duplicate<DropdownMenuShortcut>{mod}D</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => s().deleteSelection()}>
              Delete<DropdownMenuShortcut>⌫</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => s().selectAll()}>
              Select all<DropdownMenuShortcut>{mod}A</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>View</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-60">
            <DropdownMenuCheckboxItem checked={showPixelGrid} onCheckedChange={(v) => s().set({ showPixelGrid: !!v })}>
              Pixel grid<DropdownMenuShortcut>{shift}'</DropdownMenuShortcut>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={snapping} onCheckedChange={(v) => s().set({ snapping: !!v })}>
              Smart guides
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={panelsHidden} onCheckedChange={(v) => s().set({ panelsHidden: !!v })}>
              Minimize UI<DropdownMenuShortcut>{mod}\</DropdownMenuShortcut>
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => s().zoomBy(1.5)}>
              Zoom in<DropdownMenuShortcut>+</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => s().zoomBy(1 / 1.5)}>
              Zoom out<DropdownMenuShortcut>-</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => s().zoomTo(1)}>
              Zoom to 100%<DropdownMenuShortcut>{shift}0</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => s().zoomToFit()}>
              Zoom to fit<DropdownMenuShortcut>{shift}1</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Object</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-60">
            <DropdownMenuItem onSelect={() => s().groupSelection()}>
              Group selection<DropdownMenuShortcut>{mod}G</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => s().ungroupSelection()}>
              Ungroup
              <DropdownMenuShortcut>
                {shift}
                {mod}G
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => s().frameSelection()}>
              Frame selection
              <DropdownMenuShortcut>
                {alt}
                {mod}G
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => s().addAutoLayout()}>
              Add auto layout<DropdownMenuShortcut>{shift}A</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => s().flip("x")}>
              Flip horizontal<DropdownMenuShortcut>{shift}H</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => s().flip("y")}>
              Flip vertical<DropdownMenuShortcut>{shift}V</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => s().set({ showShortcuts: true })}>
          Keyboard shortcuts<DropdownMenuShortcut>{shift}?</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
