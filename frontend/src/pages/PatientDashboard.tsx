import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Calendar,
  FileText,
  MessageSquare,
  Activity,
  Clock,
  AlertTriangle,
  Heart,
  Droplets,
  TrendingUp,
  Plus,
} from 'lucide-react'
import Header from '../components/Header'
import Button from '../components/Button'
import Card from '../components/Card'

const navigationItems = [
  { label: 'Dashboard', href: '/patient-dashboard' },
  { label: 'Appointments', href: '/request-appointment' },
  { label: 'Care Plans', href: '/patient-care-plans' },
  { label: 'Records', href: '/records' },
  { label: 'Messages', href: '/message-doctor' },
]

const reminders = [
  { time: '8:00 AM', task: 'Metformin 500mg', type: 'medication' },
  { time: '8:00 PM', task: 'Metformin 500mg', type: 'medication' },
  { time: '9:00 PM', task: 'Blood pressure check', type: 'monitoring' },
]

const appointments = [
  { date: '2024-01-15', time: '10:00 AM', doctor: 'Dr. Sarah Johnson', type: 'Check-up' },
  { date: '2024-01-22', time: '2:30 PM', doctor: 'Dr. Michael Chen', type: 'Lab Review' },
]

const healthMetrics = [
  { label: 'Blood Sugar', value: '120 mg/dL', status: 'normal', icon: Droplets, trend: 'stable' },
  { label: 'Blood Pressure', value: '128/82 mmHg', status: 'elevated', icon: Heart, trend: 'up' },
  { label: 'Weight', value: '165 lbs', status: 'normal', icon: TrendingUp, trend: 'down' },
  { label: 'Heart Rate', value: '72 bpm', status: 'normal', icon: Activity, trend: 'stable' },
]

const quickActions = [
  { label: 'Log Blood Sugar', href: '/log-blood-sugar', icon: Droplets, color: 'blue' },
  { label: 'Request Appointment', href: '/request-appointment', icon: Calendar, color: 'green' },
  { label: 'Message Doctor', href: '/message-doctor', icon: MessageSquare, color: 'purple' },
  { label: 'View Records', href: '/records', icon: FileText, color: 'orange' },
]

export default function PatientDashboard() {
  const [patientName, setPatientName] = useState('Jane Cooper')
  const [patientID, setPatientID] = useState('')
  const [showPatientID, setShowPatientID] = useState(false)

  useEffect(() => {
    const storedName = localStorage.getItem('patientName')
    const storedID = localStorage.getItem('patientID')
    
    if (storedName) setPatientName(storedName)
    if (storedID) {
      setPatientID(storedID)
      setShowPatientID(true)
    }
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
      case 'elevated':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30'
      case 'high':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return '↗️'
      case 'down':
        return '↘️'
      default:
        return '➡️'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header showNavigation navigationItems={navigationItems} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome, {patientName}
          </h1>
          {showPatientID && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-4"
            >
              <p className="text-lg text-primary-600 dark:text-primary-400 font-semibold">
                Patient ID: <span className="font-mono bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded">{patientID}</span>
              </p>
            </motion.div>
          )}
          <p className="text-gray-600 dark:text-gray-400">
            Here's your personalized health overview and reminders.
          </p>
        </motion.div>

        <div className="dashboard-grid gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Today's Reminders */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-l-4 border-l-red-500">
                <div className="p-6">
                  <div className="flex items-center space-x-2 mb-6">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Today's Reminders
                    </h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                        Medication Schedule
                      </h3>
                      <div className="space-y-2">
                        {reminders.filter(r => r.type === 'medication').map((reminder, index) => (
                          <div key={index} className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-sm">{reminder.time}:</span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">{reminder.task}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                        Health Monitoring
                      </h3>
                      <div className="space-y-2">
                        {reminders.filter(r => r.type === 'monitoring').map((reminder, index) => (
                          <div key={index} className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-sm">{reminder.time}:</span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">{reminder.task}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Health Metrics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Health Metrics
              </h2>
              <div className="stats-grid">
                {healthMetrics.map((metric, index) => (
                  <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                  >
                    <Card className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <metric.icon className="w-6 h-6 text-primary-500" />
                        <span className="text-lg">{getTrendIcon(metric.trend)}</span>
                      </div>
                      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {metric.label}
                      </h3>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {metric.value}
                      </p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(metric.status)}`}>
                        {metric.status.charAt(0).toUpperCase() + metric.status.slice(1)}
                      </span>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Upcoming Appointments */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Upcoming Appointments
                </h2>
                <Button
                  as={Link}
                  to="/request-appointment"
                  size="sm"
                  icon={Plus}
                  variant="outline"
                >
                  Request New
                </Button>
              </div>
              <Card className="p-6">
                <div className="space-y-4">
                  {appointments.map((appointment, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center space-x-4">
                        <Calendar className="w-5 h-5 text-primary-500" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {appointment.type}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {appointment.doctor} • {appointment.date} at {appointment.time}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h2>
              <div className="space-y-3">
                {quickActions.map((action, index) => (
                  <motion.div
                    key={action.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    <Link
                      to={action.href}
                      className="block p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md transition-all duration-200 group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg bg-${action.color}-100 dark:bg-${action.color}-900/30`}>
                          <action.icon className={`w-5 h-5 text-${action.color}-600 dark:text-${action.color}-400`} />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">
                          {action.label}
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Recent Activity
              </h2>
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Blood sugar logged
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Appointment scheduled
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Message from Dr. Johnson
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">2 days ago</p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}