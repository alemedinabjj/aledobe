import type { ReactNode } from "react"

export function Section({ title, actions, children }: { title: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <section className="border-b border-white/[0.06] px-3 py-3">
      <header className="mb-2 flex h-6 items-center justify-between">
        <h3 className="text-[11px] font-semibold tracking-wide text-foreground/90">{title}</h3>
        <div className="flex items-center gap-0.5">{actions}</div>
      </header>
      {children}
    </section>
  )
}
