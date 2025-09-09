import { motion } from 'framer-motion'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Card from '../components/Card'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Contact Us
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Get in touch with our support team.
          </p>
        </motion.div>

        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Contact Information
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            This page would contain contact forms and support information.
          </p>
        </Card>
      </main>
      
      <Footer />
    </div>
  )
}