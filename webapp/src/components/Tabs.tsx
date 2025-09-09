import { useState } from 'react'

type Tab = { id: string; label: string; content: string }

const tabs: Tab[] = [
  { id: 'overview', label: 'Overview', content: 'Fast, modern tooling with Vite and flexible styling with Tailwind.' },
  { id: 'details', label: 'Details', content: 'Responsive utilities, dark mode, transitions, and reusable components.' },
  { id: 'reviews', label: 'Reviews', content: '“Feels snappy and delightful.” — A Happy Developer' },
]

export default function Tabs() {
  const [active, setActive] = useState<Tab['id']>('overview')

  return (
    <div className="w-full">
      <div role="tablist" aria-label="Content tabs" className="flex gap-2 rounded-xl border border-gray-200 p-1 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        {tabs.map((t) => {
          const selected = active === t.id
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={selected}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${selected ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
              onClick={() => setActive(t.id)}
            >
              {t.label}
            </button>
          )
        })}
      </div>
      <div className="mt-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <p className="text-gray-700 dark:text-gray-200">
          {tabs.find((t) => t.id === active)?.content}
        </p>
      </div>
    </div>
  )
}

