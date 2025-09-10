import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Bot, Smartphone, Zap, ArrowRight } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Button from '../components/Button'
import Card from '../components/Card'

const features = [
  {
    icon: Bot,
    title: 'AI-Powered Insights',
    description: 'Advanced machine learning algorithms analyze patient data to provide predictive health insights, early warning systems, and personalized treatment recommendations.',
  },
  {
    icon: Smartphone,
    title: 'Smart Patient Management',
    description: 'Comprehensive patient profiles, automated reminders, medication tracking, and real-time health monitoring for proactive care management.',
  },
  {
    icon: Zap,
    title: 'Efficient Workflow',
    description: 'Streamlined appointment scheduling, automated care plan generation, and intelligent resource allocation to maximize healthcare efficiency.',
  },
]

const steps = [
  {
    number: '1',
    title: 'Connect & Onboard',
    description: 'Healthcare providers and patients create accounts with role-based access and personalized dashboards.',
  },
  {
    number: '2',
    title: 'AI Analysis & Insights',
    description: 'Our AI continuously analyzes health data, identifies patterns, and generates actionable insights for better care decisions.',
  },
  {
    number: '3',
    title: 'Proactive Care Delivery',
    description: 'Automated reminders, personalized care plans, and predictive alerts ensure timely interventions and improved outcomes.',
  },
]

const benefits = {
  doctors: [
    'AI-powered patient risk assessment',
    'Automated appointment scheduling',
    'Real-time patient monitoring',
    'Predictive analytics for treatment planning',
    'Streamlined care plan management',
  ],
  patients: [
    'Personalized health insights',
    'Automated medication reminders',
    'Easy appointment booking',
    'Secure health record access',
    '24/7 AI health assistant',
  ],
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden hero-gradient">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3Cpattern id='grain' width='100' height='100' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='50' cy='50' r='1' fill='white' opacity='0.1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23grain)'/%3E%3C/svg%3E")`,
            }} />
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6"
              >
                MEDUCO
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-xl md:text-2xl font-semibold text-white/95 mb-4"
              >
                Revolutionary AI-Powered Patient Care Management Platform
              </motion.p>
              
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-lg text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed"
              >
                Transform healthcare delivery with intelligent automation, predictive analytics, and personalized patient care. MEDUCO combines cutting-edge artificial intelligence with comprehensive healthcare management tools to enhance patient outcomes and streamline medical operations.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <Button
                  as={Link}
                  to="/login"
                  size="lg"
                  icon={ArrowRight}
                  iconPosition="right"
                  className="bg-white text-primary-600 hover:bg-gray-100 shadow-lg"
                >
                  Get Started
                </Button>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Why Choose MEDUCO?
              </h2>
            </motion.div>
            
            <div className="feature-grid">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="text-center p-8 h-full">
                    <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-primary-500 to-purple-600 rounded-2xl flex items-center justify-center">
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      {feature.description}
                    </p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 bg-gray-50 dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                How MEDUCO Works
              </h2>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {steps.map((step, index) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  className="text-center"
                >
                  <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-primary-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Benefits for Healthcare Providers
              </h2>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <Card className="p-8 h-full">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                    For Doctors & Clinicians
                  </h3>
                  <ul className="space-y-3">
                    {benefits.doctors.map((benefit, index) => (
                      <motion.li
                        key={benefit}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start space-x-3"
                      >
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-gray-600 dark:text-gray-300">{benefit}</span>
                      </motion.li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <Card className="p-8 h-full">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                    For Patients
                  </h3>
                  <ul className="space-y-3">
                    {benefits.patients.map((benefit, index) => (
                      <motion.li
                        key={benefit}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start space-x-3"
                      >
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-gray-600 dark:text-gray-300">{benefit}</span>
                      </motion.li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  )
}