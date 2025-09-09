import { motion } from 'framer-motion'
import Header from '../components/Header'
import Card from '../components/Card'

const navigationItems = [
  { label: 'Dashboard', href: '/doctor-dashboard' },
  { label: 'Patients', href: '/patients' },
  { label: 'Appointments', href: '/appointments' },
  { label: 'Care Plans', href: '/care-plans' },
  { label: 'Messages', href: '/doctor-messages' },
]

export default function CarePlansPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header showNavigation navigationItems={navigationItems} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Care Plans
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage patient care plans and treatment schedules.
          </p>
        </motion.div>

        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Care Plans Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            This page would contain care plan management features for doctors.
          </p>
        </Card>
      </main>
    </div>
  )
}