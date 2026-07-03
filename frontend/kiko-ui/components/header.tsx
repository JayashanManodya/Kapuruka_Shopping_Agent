import { ShoppingCart, RotateCcw, Settings } from 'lucide-react'
import Image from 'next/image'

export function Header() {
  return (
    <header className="w-full px-6 md:px-8 py-4 md:py-6 flex items-center justify-between backdrop-blur-sm">
      <Image
        src="/kapruka-logo.webp"
        alt="Kapruka"
        width={160}
        height={50}
        className="h-auto w-32 md:w-48"
        priority
      />
      
      <div className="flex items-center gap-3">
        {/* History Icon */}
        <button className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all shadow-md" style={{ backgroundColor: '#5322B8' }}>
          <RotateCcw className="w-5 h-5 md:w-6 md:h-6 text-white stroke-2" />
        </button>

        {/* Shopping Bag Icon */}
        <button className="relative w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all shadow-md" style={{ backgroundColor: '#5322B8' }}>
          <div className="absolute -top-1 -right-1 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold text-white shadow-lg">
            3
          </div>
          <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 text-white stroke-2" />
        </button>

        {/* Settings Icon */}
        <button className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all shadow-md" style={{ backgroundColor: '#5322B8' }}>
          <Settings className="w-5 h-5 md:w-6 md:h-6 text-white stroke-2" />
        </button>
      </div>
    </header>
  )
}
