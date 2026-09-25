import { Link } from "react-router"
import { motion } from "motion/react"
import {
  Check,
  Code2,
  Download,
  Frame,
  Layers,
  LayoutGrid,
  MousePointerClick,
  PenTool,
  Sparkles,
  Type,
  Users,
  Wand2,
} from "lucide-react"
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, cn } from "@aledobe/ui"

const FEATURES = [
  {
    icon: Frame,
    title: "Frames & device presets",
    text: "iPhone, Android, desktop and social presets with clip content and nesting.",
  },
  {
    icon: LayoutGrid,
    title: "Auto layout",
    text: "Direction, gap, padding, alignment, hug contents and drag-to-reorder.",
  },
  {
    icon: PenTool,
    title: "Pen & pencil",
    text: "Bézier paths with handles, freehand drawing with smoothing, polygons and stars.",
  },
  {
    icon: Type,
    title: "Rich typography",
    text: "10 curated font families, weights, line height, tracking, case and decoration.",
  },
  {
    icon: Wand2,
    title: "Fills, strokes & effects",
    text: "Multiple fills, linear and radial gradients, shadows, blur and 16 blend modes.",
  },
  {
    icon: MousePointerClick,
    title: "Smart guides",
    text: "Snapping, distance measuring with ⌥, alignment and distribution tools.",
  },
  {
    icon: Layers,
    title: "Layers & pages",
    text: "Tree with drag and drop, rename, lock, hide, groups and multiple pages.",
  },
  {
    icon: Code2,
    title: "Dev mode",
    text: "Inspect any layer and copy CSS or Tailwind classes straight into your code.",
  },
  { icon: Download, title: "Export anything", text: "PNG, JPG and SVG at 0.5x–4x, per layer or the whole page." },
]

export function Features() {
  return (
    <section id="features" className="relative wide py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <Badge variant="neon" className="mb-4">
          Everything you need
        </Badge>
        <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">A real design tool, not a toy.</h2>
        <p className="mt-4 text-muted-foreground">
          The core of a professional editor — built for speed, keyboard-first and familiar if you come from Figma.
        </p>
      </div>
      <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-card/60 p-6 transition-colors hover:border-primary/40"
          >
            <div className="absolute -top-16 -right-16 size-40 rounded-full bg-primary/0 blur-3xl transition-colors duration-500 group-hover:bg-primary/20" />
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-neon ring-1 ring-primary/30">
              <f.icon className="size-5" />
            </div>
            <h3 className="mt-5 font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

const FLOW = [
  {
    n: "01",
    title: "Sign in with one click",
    text: "Google, GitHub or LinkedIn. Your workspace is created instantly.",
  },
  {
    n: "02",
    title: "Create a project",
    text: "Group files by client, product or sprint. Each file autosaves as you work.",
  },
  {
    n: "03",
    title: "Design on the canvas",
    text: "Frames, auto layout, vectors and text with smart guides and keyboard shortcuts.",
  },
  { n: "04", title: "Hand off & export", text: "Inspect CSS, export assets or share the link with your team." },
]

export function HowItWorks() {
  return (
    <section id="how" className="relative border-y border-white/[0.06] bg-panel/60 py-20 sm:py-28">
      <div className="wide">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] xl:gap-20">
          <div>
            <Badge variant="neon" className="mb-4">
              How it works
            </Badge>
            <h2 className="font-display text-4xl font-bold tracking-tight">From idea to handoff in four steps.</h2>
            <p className="mt-4 text-muted-foreground">
              Your workflow, your projects. Everything is organised per user, synced to the cloud and ready for your
              team.
            </p>
            <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
              <Users className="size-4 text-neon" /> Personal workspace per user
            </div>
          </div>
          <ol className="relative space-y-4">
            <div className="absolute top-4 bottom-4 left-[27px] w-px bg-gradient-to-b from-primary/60 via-primary/20 to-transparent" />
            {FLOW.map((s, i) => (
              <motion.li
                key={s.n}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative flex gap-5 rounded-2xl border border-white/[0.06] bg-card/70 p-5"
              >
                <span className="relative z-10 flex size-14 shrink-0 items-center justify-center rounded-xl bg-background font-display text-lg font-bold text-neon ring-1 ring-primary/40">
                  {s.n}
                </span>
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Everything you need to design.",
    features: [
      "Unlimited files",
      "3 projects",
      "All design tools",
      "PNG, JPG & SVG export",
      "Dev mode (CSS & Tailwind)",
    ],
    cta: "Start for free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$8",
    period: "per month",
    description: "Support the project and unlock more.",
    features: [
      "Unlimited projects",
      "Version history",
      "Priority support",
      "4x export & batch export",
      "Early access to features",
    ],
    cta: "Upgrade to Pro",
    highlight: true,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="wide py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <Badge variant="neon" className="mb-4">
          Pricing
        </Badge>
        <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Free. Really.</h2>
        <p className="mt-4 text-muted-foreground">
          Pro is optional and keeps the lights on. Payments are handled securely by Stripe.
        </p>
      </div>
      <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-2">
        {PLANS.map((p) => (
          <Card
            key={p.name}
            className={cn(
              "relative overflow-hidden",
              p.highlight &&
                "border-primary/50 shadow-neon before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-fuchsia-400 before:to-transparent",
            )}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-xl">{p.name}</CardTitle>
                {p.highlight && (
                  <Badge variant="neon">
                    <Sparkles /> Popular
                  </Badge>
                )}
              </div>
              <CardDescription>{p.description}</CardDescription>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-5xl font-bold">{p.price}</span>
                <span className="text-sm text-muted-foreground">/{p.period}</span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <ul className="space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <Check className="size-4 text-neon" /> {f}
                  </li>
                ))}
              </ul>
              <Button asChild variant={p.highlight ? "neon" : "outline"} size="lg">
                <Link to={p.highlight ? "/dashboard?upgrade=pro" : "/login"}>{p.cta}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

export function CallToAction() {
  return (
    <section className="wide pb-20 sm:pb-28">
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-violet-950 via-[#12091f] to-fuchsia-950 px-8 py-16 text-center">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <h2 className="relative font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Your next design starts here.
        </h2>
        <p className="relative mx-auto mt-4 max-w-lg text-muted-foreground">
          No downloads, no trials, no limits on creativity.
        </p>
        <Button asChild size="lg" variant="neon" className="relative mt-8">
          <Link to="/login">Create your free account</Link>
        </Button>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-10">
      <div className="wide flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
        <span>© {new Date().getFullYear()} Aledobe. Built for designers who ship.</span>
        <div className="flex gap-6">
          <a href="#features" className="hover:text-foreground">
            Features
          </a>
          <a href="#pricing" className="hover:text-foreground">
            Pricing
          </a>
          <Link to="/login" className="hover:text-foreground">
            Log in
          </Link>
        </div>
      </div>
    </footer>
  )
}
