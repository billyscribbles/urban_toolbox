import SEO from '../lib/seo.jsx'
import SplitHero from '../components/SplitHero.jsx'
import CategoryCarousel from '../components/CategoryCarousel.jsx'
import TrustBar from '../components/TrustBar.jsx'
import WhatWeBuild from '../components/WhatWeBuild.jsx'
import Process from '../components/Process.jsx'
import Capability from '../components/Capability.jsx'
import CtaBand from '../components/CtaBand.jsx'
import { cta } from '../content/cta.js'

export default function Home() {
  return (
    <main>
      <SEO />
      <div className="hero-fold">
        <SplitHero />
        <TrustBar />
        <CategoryCarousel />
      </div>
      <WhatWeBuild />
      <Process />
      <Capability />
      <CtaBand sub={cta.homeSub} />
    </main>
  )
}
