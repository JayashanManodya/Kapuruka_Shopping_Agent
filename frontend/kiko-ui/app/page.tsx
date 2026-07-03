import { Header } from '@/components/header'
import { Hero } from '@/components/hero'
import { SearchBar } from '@/components/search-bar'
import { Categories } from '@/components/categories'
import { Footer } from '@/components/footer'

export default function Page() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-col items-center px-4 gap-6 pt-8 flex-1">
        <Hero />
        <div className="flex flex-col items-center gap-1">
          <SearchBar />
          <Categories />
        </div>
      </div>
      <Footer />
    </main>
  )
}
