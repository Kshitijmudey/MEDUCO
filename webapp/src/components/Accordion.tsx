import { useState } from 'react'

type Item = { id: number; title: string; content: string }

const defaultItems: Item[] = [
  { id: 1, title: 'What is this?', content: 'A responsive React + Tailwind demo with interactive components.' },
  { id: 2, title: 'Is it accessible?', content: 'It uses semantic HTML and focusable controls; customize further as needed.' },
  { id: 3, title: 'Can I customize it?', content: 'Yes, Tailwind utilities make it easy to tweak spacing, colors, and animations.' },
]

export default function Accordion({ items = defaultItems }: { items?: Item[] }) {
  const [openId, setOpenId] = useState<number | null>(1)

  return (
    <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
      {items.map((item) => {
        const isOpen = openId === item.id
        return (
          <div key={item.id}>
            <button
              className="w-full text-left px-4 py-3 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-900"
              aria-expanded={isOpen}
              onClick={() => setOpenId(isOpen ? null : item.id)}
            >
              <span className="font-medium text-gray-900 dark:text-gray-100">{item.title}</span>
              <svg className={`h-5 w-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className={`px-4 overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-40 py-2' : 'max-h-0'}`}>
              <p className="text-sm text-gray-600 dark:text-gray-300">{item.content}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

