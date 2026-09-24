import { useState } from "react"
import { Check, Loader2, Sparkles } from "lucide-react"
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, toast } from "@aledobe/ui"
import { useSession } from "../../lib/session"

const PERKS = ["Unlimited projects", "Version history", "4x & batch export", "Priority support", "Early access"]

export function UpgradeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const api = useSession((s) => s.api)
  const user = useSession((s) => s.user)
  const [busy, setBusy] = useState(false)
  const pro = user?.plan === "pro"

  const go = async () => {
    if (!api) return
    setBusy(true)
    try {
      const { url } = pro ? await api.billingPortal() : await api.checkout("pro")
      window.location.href = url
    } catch (e) {
      toast.error((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        <div className="relative bg-gradient-to-br from-violet-700 via-fuchsia-700 to-violet-900 px-6 pt-8 pb-6">
          <div className="absolute inset-0 bg-grid opacity-40" />
          <DialogHeader className="relative">
            <span className="flex size-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30">
              <Sparkles className="size-5" />
            </span>
            <DialogTitle className="mt-3 font-display text-2xl">{pro ? "You're on Pro" : "Aledobe Pro"}</DialogTitle>
            <DialogDescription className="text-violet-100/80">
              {pro
                ? "Manage your subscription, invoices and payment method."
                : "$8/month. Cancel anytime. Secure checkout by Stripe."}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="grid gap-5 p-6">
          <ul className="grid gap-2 text-sm">
            {PERKS.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <Check className="size-4 text-neon" /> {p}
              </li>
            ))}
          </ul>
          <Button variant="neon" size="lg" onClick={go} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            {pro ? "Manage billing" : "Continue to checkout"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
