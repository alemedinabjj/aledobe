import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@aledobe/ui"
import { useEditor } from "../core/store"
import { SHORTCUTS } from "../core/shortcuts"

export function ShortcutsDialog() {
  const open = useEditor((s) => s.showShortcuts)
  return (
    <Dialog open={open} onOpenChange={(v) => useEditor.getState().set({ showShortcuts: v })}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Work faster. On Windows and Linux, use Ctrl instead of ⌘ and Alt instead of ⌥.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 sm:grid-cols-2">
          {SHORTCUTS.map((g) => (
            <div key={g.group}>
              <h4 className="mb-2 text-xs font-semibold tracking-wider text-neon uppercase">{g.group}</h4>
              <ul className="space-y-1">
                {g.items.map(([label, keys]) => (
                  <li key={label} className="flex items-center justify-between gap-4 text-[13px]">
                    <span className="text-muted-foreground">{label}</span>
                    <kbd className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap">
                      {keys}
                    </kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
