import { Navbar } from "../components/landing/Navbar"
import { Hero } from "../components/landing/Hero"
import { CallToAction, Features, Footer, HowItWorks, Pricing } from "../components/landing/Sections"

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <CallToAction />
      <Footer />
    </div>
  )
}
