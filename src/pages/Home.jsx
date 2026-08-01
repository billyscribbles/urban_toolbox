import SEO from '../lib/seo.jsx'
import Hero from '../components/Hero.jsx'
import CategoryCarousel from '../components/CategoryCarousel.jsx'
import TrustBar from '../components/TrustBar.jsx'
import FeaturedRail from '../components/FeaturedRail.jsx'
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
        <Hero />
        <TrustBar />
      </div>
      <FeaturedRail />
      <CategoryCarousel />
      <WhyChoose />
      <DistanceCta />
      <StoryBlock />
      <Process />
      <Testimonials />
    </main>
  )
}
