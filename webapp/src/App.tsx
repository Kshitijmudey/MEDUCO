import { useState } from 'react'
import Navbar from './components/Navbar'
import Accordion from './components/Accordion'
import Tabs from './components/Tabs'
import Modal from './components/Modal'

export default function App() {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <section className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-center">
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Responsive & Interactive UI</h1>
            <p className="text-gray-600 dark:text-gray-300">Built with React + Tailwind CSS. Resize the window to see the responsive layout and toggle dark mode for theming.</p>
            <div className="flex gap-3">
              <button className="rounded-lg bg-indigo-600 px-4 py-2 text-white shadow hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" onClick={() => setOpen(true)}>Open modal</button>
              <a href="#features" className="rounded-lg border border-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-900">Learn more</a>
            </div>
          </div>
          <div className="rounded-2xl border border-dashed border-gray-300 p-6 dark:border-gray-800">
            <Tabs />
          </div>
        </section>

        <section id="features" className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            { title: 'Responsive', text: 'Mobile-first utility classes make layouts adapt seamlessly.' },
            { title: 'Interactive', text: 'Accessible components with smooth transitions.' },
            { title: 'Customizable', text: 'Design quickly without leaving your HTML.' },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-gray-200 p-6 shadow-sm dark:border-gray-800">
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{f.text}</p>
            </div>
          ))}
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-4">FAQs</h2>
          <Accordion />
        </section>
      </main>

      <Modal open={open} onClose={() => setOpen(false)} title="Welcome!">
        This modal demonstrates animated entry, overlay blur, and focusable controls.
      </Modal>
    </div>
  )
}
