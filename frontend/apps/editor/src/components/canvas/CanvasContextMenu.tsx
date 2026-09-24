import type { ReactNode } from "react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@aledobe/ui"
import { useEditor } from "../../core/store"
import { isContainer } from "../../core/doc"
import { exportSelection } from "../../core/export"
import { mod, shift, alt } from "../../core/platform"

export function CanvasContextMenu({ children }: { children: ReactNode }) {
  const selection = useEditor((s) => s.selection)
  const doc = useEditor((s) => s.doc)
  const clipboard = useEditor((s) => s.clipboard)
  const has = selection.length > 0
  const nodes = selection.map((id) => doc.nodes[id]).filter(Boolean)
  const canUngroup = nodes.some((n) => isContainer(n))
  const allVisible = nodes.every((n) => n.visible)
  const allLocked = nodes.every((n) => n.locked)
  const s = useEditor.getState

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-60">
        <ContextMenuItem disabled={!has} onSelect={() => s().copy()}>
          Copy<ContextMenuShortcut>{mod}C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem disabled={!has} onSelect={() => s().cut()}>
          Cut<ContextMenuShortcut>{mod}X</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem disabled={!clipboard} onSelect={() => s().paste()}>
          Paste here<ContextMenuShortcut>{mod}V</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem disabled={!has} onSelect={() => s().duplicateSelection()}>
          Duplicate<ContextMenuShortcut>{mod}D</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem disabled={!has} variant="destructive" onSelect={() => s().deleteSelection()}>
          Delete<ContextMenuShortcut>⌫</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled={!has} onSelect={() => s().reorder("front")}>
          Bring to front
          <ContextMenuShortcut>
            {alt}
            {mod}]
          </ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem disabled={!has} onSelect={() => s().reorder("forward")}>
          Bring forward<ContextMenuShortcut>{mod}]</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem disabled={!has} onSelect={() => s().reorder("backward")}>
          Send backward<ContextMenuShortcut>{mod}[</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem disabled={!has} onSelect={() => s().reorder("back")}>
          Send to back
          <ContextMenuShortcut>
            {alt}
            {mod}[
          </ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled={!has} onSelect={() => s().groupSelection()}>
          Group selection<ContextMenuShortcut>{mod}G</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem disabled={!has} onSelect={() => s().frameSelection()}>
          Frame selection
          <ContextMenuShortcut>
            {alt}
            {mod}G
          </ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem disabled={!canUngroup} onSelect={() => s().ungroupSelection()}>
          Ungroup
          <ContextMenuShortcut>
            {shift}
            {mod}G
          </ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem disabled={!has} onSelect={() => s().addAutoLayout()}>
          Add auto layout<ContextMenuShortcut>{shift}A</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger disabled={!has}>Flip</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onSelect={() => s().flip("x")}>
              Flip horizontal<ContextMenuShortcut>{shift}H</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => s().flip("y")}>
              Flip vertical<ContextMenuShortcut>{shift}V</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem disabled={!has} onSelect={() => s().toggleVisible()}>
          {allVisible ? "Hide" : "Show"}
          <ContextMenuShortcut>
            {shift}
            {mod}H
          </ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem disabled={!has} onSelect={() => s().toggleLocked()}>
          {allLocked ? "Unlock" : "Lock"}
          <ContextMenuShortcut>
            {shift}
            {mod}L
          </ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger disabled={!has}>Copy / Export as</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onSelect={() => exportSelection("png", 2)}>Export PNG @2x</ContextMenuItem>
            <ContextMenuItem onSelect={() => exportSelection("svg", 1)}>Export SVG</ContextMenuItem>
            <ContextMenuItem onSelect={() => exportSelection("jpg", 1)}>Export JPG</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => s().zoomToFit(has ? selection : undefined)}>
          {has ? "Zoom to selection" : "Zoom to fit"}
          <ContextMenuShortcut>
            {shift}
            {has ? "2" : "1"}
          </ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
