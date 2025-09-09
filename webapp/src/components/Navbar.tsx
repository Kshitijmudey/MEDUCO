import { useEffect, useState } from 'react'

type NavbarProps = {
  links?: { label: string; href: string }[]
}

export default function Navbar({ links = [
  { label: 'Home', href: '#' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'About', href: '#about' },
] }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldDark = saved ? saved === 'dark' : prefersDark
    setIsDark(shouldDark)
    document.documentElement.classList.toggle('dark', shouldDark)
  }, [])

  function toggleDarkMode() {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <nav className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow ring-1 ring-black/10" />
            <span className="font-semibold text-gray-900 dark:text-gray-100">WebApp</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
                {l.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button aria-label="Toggle dark mode" onClick={toggleDarkMode} className="inline-flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              {isDark ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M21.752 15.002A9.718 9.718 0 0 1 12 21.75 9.75 9.75 0 0 1 8.998 2.248a.75.75 0 0 1 .936.936A8.25 8.25 0 1 0 20.816 14.07a.75.75 0 0 1 .936.936Z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M12 1.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V2.25A.75.75 0 0 1 12 1.5Zm0 18a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Zm10.5-7.5a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75Zm-18 0a.75.75 0 0 1-.75.75H2.25a.75.75 0 0 1 0-1.5H3.75a.75.75 0 0 1 .75.75Zm15.035 6.035a.75.75 0 0 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 1.06-1.06l1.06 1.06Zm-12.01-12.01a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 1 1 1.06 1.06L7.525 6.525Zm12.01-1.06a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0ZM6.465 18.975a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 1.06l-1.06 1.06ZM12 6.75A5.25 5.25 0 1 0 12 17.25 5.25 5.25 0 0 0 12 6.75Z" />
                </svg>
              )}
            </button>
            <button onClick={() => setMenuOpen((v) => !v)} className="md:hidden inline-flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" aria-label="Toggle menu">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        <div className={`md:hidden overflow-hidden transition-[max-height] duration-300 ${menuOpen ? 'max-h-64' : 'max-h-0'}`}>
          <div className="space-y-1 pb-3 pt-2">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}

