import { Navbar } from '@/components/navbar'
import { Hero } from '@/components/hero'
import {
  CaseStudy,
  CtaBand,
  Features,
  HowItWorks,
  SiteFooter,
  StatsStrip,
} from '@/components/sections'

export default function Page() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <StatsStrip />
        <Features />
        <HowItWorks />
        <CaseStudy />
        <CtaBand />
      </main>
      <SiteFooter />
    </>
  )
}
