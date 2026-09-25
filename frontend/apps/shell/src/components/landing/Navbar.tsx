import { Link } from "react-router"
import { Button } from "@aledobe/ui"
import { Logo } from "../Logo"
import { useSession } from "../../lib/session"

export function Navbar() {
  const user = useSession((s) => s.user)
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="wide">
        <div className="mt-3 flex h-14 items-center sm:mt-4 justify-between rounded-2xl border border-white/[0.07] px-4 glass">
          <Link to="/">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#how" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#pricing" className="transition-colors hover:text-foreground">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild size="sm">
                <Link to="/dashboard">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link to="/login">Log in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/login">Get started free</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
