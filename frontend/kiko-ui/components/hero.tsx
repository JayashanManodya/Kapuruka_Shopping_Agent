import Image from 'next/image'

export function Hero() {
  return (
    <div className="flex flex-col items-center gap-0">
      {/* Chatbot Icon - Top */}
      <div className="flex-shrink-0 flex flex-col items-center mb-4">
        <div className="float-rotate-animation">
          <Image
            src="/chatbot-logo.png"
            alt="Kapruka AI Chatbot"
            width={120}
            height={120}
            className="w-24 h-24 md:w-32 md:h-32"
            priority
          />
        </div>
      </div>

      {/* Heading */}
      <div className="text-center max-w-3xl">
        <h1 className="text-3xl md:text-5xl font-bold leading-tight" style={{ color: '#2D2375' }}>
          Hi I&apos;m <span style={{ color: '#5322B8' }}>KIKO</span>, Ready to
          <br />
          Help Shopping?
        </h1>
      </div>
    </div>
  )
}
