import { lazy, Suspense, useState } from "react"
import { Link } from "react-router"
import { motion, AnimatePresence } from "motion/react"
import { ArrowRight, Play, Sparkles } from "lucide-react"
import { Badge, Button, cn } from "@aledobe/ui"
import { STEPS } from "./steps"

const HeroScene = lazy(() => import("./HeroScene").then((m) => ({ default: m.HeroScene })))

export function Hero() {
  const [step, setStep] = useState(0)
  return (
    <section className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden pt-28 pb-10 sm:pt-32 lg:pt-24 lg:pb-12">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[min(1400px,160vw)] -translate-x-1/2 rounded-full bg-violet-600/25 blur-[140px]" />
      <div className="relative z-10 wide">
        <div className="lg:w-[46%] xl:w-[42%]">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge variant="neon" className="mb-6 gap-1.5 px-3 py-1">
              <Sparkles /> 100% free · no credit card
            </Badge>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="font-display text-[2.6rem] leading-[1.02] font-bold tracking-tight sm:text-6xl lg:text-7xl"
          >
            The design tool
            <br />
            <span className="text-gradient">that costs nothing.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-6 max-w-xl text-base leading-relaxed sm:text-lg text-muted-foreground"
          >
            Frames, auto layout, vectors, text, effects, pages and export — a focused Figma alternative that runs in
            your browser. Sign in with Google, GitHub or LinkedIn and start designing in seconds.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Button asChild size="lg" variant="neon">
              <Link to="/login">
                Start designing <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/playground">
                <Play /> Try without an account
              </Link>
            </Button>
          </motion.div>
          <div className="mt-10 grid max-w-md grid-cols-2 gap-x-3 gap-y-3 sm:mt-12 sm:grid-cols-4 sm:gap-2">
            {STEPS.map((s, i) => (
              <button key={s.key} type="button" className="group text-left" onClick={() => setStep(i)}>
                <div className="h-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cn(
                      "h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-500",
                      i === step ? "w-full" : i < step ? "w-full opacity-40" : "w-0",
                    )}
                  />
                </div>
                <div
                  className={cn(
                    "mt-2 text-xs font-medium transition-colors",
                    i === step ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {String(i + 1).padStart(2, "0")} {s.title}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-3 min-h-10 max-w-md text-sm sm:min-h-6 text-muted-foreground">
            <AnimatePresence mode="wait">
              <motion.p
                key={step}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                {STEPS[step].text}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.2 }}
        className="relative mt-6 aspect-[4/3.4] w-full sm:aspect-[16/10] lg:absolute lg:inset-y-0 lg:right-0 lg:mt-0 lg:aspect-auto lg:w-[60%] lg:[mask-image:linear-gradient(to_right,transparent,black_22%)] 2xl:w-[62%]"
      >
        <div className="absolute inset-8 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <Suspense fallback={<div className="size-full animate-pulse rounded-3xl bg-white/[0.02]" />}>
          <HeroScene onStep={setStep} />
        </Suspense>
      </motion.div>
    </section>
  )
}
