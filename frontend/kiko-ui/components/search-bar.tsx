'use client'

import Image from 'next/image'
import { Mic, Paperclip } from 'lucide-react'

export function SearchBar() {
  return (
    <div className="w-full max-w-xl mb-3 md:mb-4">
      <div className="glossy-dark rounded-full px-5 py-3 flex items-center gap-2 md:gap-3 group search-glow">
        {/* Kiko Icon */}
        <Image
          src="/chatbot-logo.png"
          alt="Kiko"
          width={24}
          height={24}
          className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0"
        />

        {/* Input Field */}
        <input
          type="text"
          placeholder="Ask anything you want..."
          className="flex-1 bg-transparent outline-none text-gray-700 placeholder-gray-400 text-xs md:text-sm"
        />

        {/* Microphone Icon */}
        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <Mic className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
        </button>

        {/* Attachment Icon */}
        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <Paperclip className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
        </button>
      </div>
    </div>
  )
}
