import SEO from '../lib/seo.jsx'
import SplitHero from '../components/SplitHero.jsx'
import CategoryCarousel from '../components/CategoryCarousel.jsx'
import TrustBar from '../components/TrustBar.jsx'
import WhyChoose from '../components/WhyChoose.jsx'
import DistanceCta from '../components/DistanceCta.jsx'
import StoryBlock from '../components/StoryBlock.jsx'
import Process from '../components/Process.jsx'
import Testimonials from '../components/Testimonials.jsx'

export default function Home() {
  return (
    <main>
      <SEO />
      <div className="hero-fold">
        <SplitHero />
        <TrustBar />
      </div>
      <CategoryCarousel />
      <WhyChoose />
      <DistanceCta />
      <StoryBlock />
      <Process />
      <Testimonials />
    </main>
  )
}
