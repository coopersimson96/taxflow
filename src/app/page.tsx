import { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Hero from '@/components/layout/Hero'
import Features from '@/components/layout/Features'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Never Accidentally Spend Your Tax Money Again - Tax Tracker',
  description: 'Automatically track tax collected from your Shopify and Square sales. Know exactly how much money to set aside so it\'s there when you need to pay taxes.',
}

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <Features />
      <Footer />
    </main>
  )
}