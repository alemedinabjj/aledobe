import { useEffect, useState } from "react"
import { Link, Navigate, useSearchParams } from "react-router"
import { motion } from "motion/react"
import { ArrowLeft } from "lucide-react"
import { Badge, Button } from "@aledobe/ui"
import { Logo } from "../components/Logo"
import { GithubIcon, GoogleIcon, LinkedinIcon } from "../components/BrandIcons"
import { useSession } from "../lib/session"
import type { Provider } from "../lib/types"
import type { AuthOptions } from "../lib/api"

const PROVIDERS: { id: Provider; label: string; icon: React.ReactNode }[] = [
  { id: "google", label: "Continue with Google", icon: <GoogleIcon /> },
  { id: "github", label: "Continue with GitHub", icon: <GithubIcon /> },
  { id: "linkedin", label: "Continue with LinkedIn", icon: <LinkedinIcon /> },
]

const ERRORS: Record<string, string> = {
  oauth_failed: "We couldn't sign you in with that provider. Please try again.",
  provider_disabled: "This provider isn't configured on the server yet.",
  email_unverified: "Your provider didn't confirm this email address. Verify it and try again.",
}

export default function Login() {
  const { user, api, available, ready } = useSession()
  const [params] = useSearchParams()
  const error = params.get("error")
  const [options, setOptions] = useState<AuthOptions | null>(null)

  useEffect(() => {
    if (!ready || !available) return
    api
      .authOptions()
      .then(setOptions)
      .catch(() => setOptions({ providers: [] }))
  }, [api, ready, available])

  if (user) return <Navigate to="/dashboard" replace />

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <Link to="/">
            <Logo />
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft /> Back
            </Link>
          </Button>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12"
        >
          <h1 className="font-display text-3xl font-bold tracking-tight">Welcome to Aledobe</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to sync your projects across devices.</p>
          {error && (
            <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-rose-200">
              {ERRORS[error] ?? "Something went wrong. Please try again."}
            </div>
          )}
          <div className="mt-8 flex flex-col gap-3">
            {PROVIDERS.map((p) => {
              const enabled = !!options?.providers.includes(p.id)
              return (
                <Button
                  key={p.id}
                  variant="outline"
                  size="lg"
                  disabled={!enabled}
                  className="justify-start gap-3 bg-white/[0.02] text-sm"
                  onClick={() => {
                    if (enabled) window.location.href = api.loginUrl(p.id)
                  }}
                >
                  {p.icon}
                  <span className="flex-1 text-center">{p.label}</span>
                  {options && !enabled && <Badge variant="outline">Em breve</Badge>}
                </Button>
              )
            })}
          </div>
          {ready && !available && (
            <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-rose-200">
              Sign-in is temporarily unavailable. Please try again in a few minutes.
            </div>
          )}
          <p className="mt-10 text-center text-xs text-muted-foreground">
            By continuing you agree to our Terms and Privacy Policy.
          </p>
        </motion.div>
      </div>
      <div className="relative hidden overflow-hidden border-l border-white/[0.06] bg-gradient-to-br from-violet-950 via-[#0d0918] to-fuchsia-950 lg:block">
        <div className="absolute inset-0 bg-grid opacity-70" />
        <div className="absolute top-1/4 left-1/4 size-72 animate-glow rounded-full bg-violet-500/40 blur-[100px]" />
        <div className="absolute right-1/4 bottom-1/4 size-72 animate-glow rounded-full bg-fuchsia-500/30 blur-[100px] [animation-delay:1.5s]" />
        <div className="relative flex h-full flex-col justify-end p-12">
          <div className="animate-float rounded-2xl border border-white/10 p-6 glass">
            <p className="text-xs font-semibold tracking-widest text-neon uppercase">Keyboard-first</p>
            <p className="mt-2 font-display text-2xl font-semibold">Everything one keystroke away.</p>
            <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
              {[
                ["Frame", "F"],
                ["Rectangle", "R"],
                ["Pen", "P"],
                ["Text", "T"],
                ["Auto layout", "⇧ A"],
                ["Export", "⇧ ⌘ E"],
              ].map(([label, key]) => (
                <div key={label} className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
                  <span className="text-muted-foreground">{label}</span>
                  <kbd className="rounded bg-white/10 px-1.5 font-mono text-xs">{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
