export function Footer() {
  return (
    <footer className="w-full py-6 px-4 text-center">
      <p className="text-sm text-gray-600">
        Powered by <span style={{ color: '#5322B8' }} className="font-semibold">Kapruka MCP</span> • Build by{' '}
        <a 
          href="https://www.jayashan.online/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="font-semibold transition-colors hover:text-gray-700"
          style={{ color: '#5322B8' }}
        >
          Jayashan Manodya
        </a>
      </p>
    </footer>
  )
}
