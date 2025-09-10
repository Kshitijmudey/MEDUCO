import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Calendar,
  FileText,
  MessageSquare,
  Activity,
  TrendingUp,
  Clock,
  AlertCircle,
  User,
  Heart,
} from 'lucide-react'
import Header from '../components/Header'
import Card from '../components/Card'

const navigationItems = [
  { label: 'Dashboard', href: '/doctor-dashboard' },
  { label: 'Patients', href: '/patients' },
  { label: 'Appointments', href: '/appointments' },
  { label: 'Care Plans', href: '/care-plans' },
  { label: 'Messages', href: '/doctor-messages' },
]

const stats = [
  { label: 'Total Patients', value: '247', icon: Users, color: 'blue' },
  { label: 'Today\'s Appointments', value: '12', icon: Calendar, color: 'green' },
  { label: 'Pending Reviews', value: '8', icon: FileText, color: 'orange' },
  { label: 'Unread Messages', value: '5', icon: MessageSquare, color: 'purple' },
]

const recentPatients = [
  { name: 'Jane Cooper', condition: 'Type 2 Diabetes', status: 'stable', lastVisit: '2 days ago' },
  { name: 'John Smith', condition: 'Hypertension', status: 'improving', lastVisit: '1 week ago' },
  { name: 'Sarah Wilson', condition: 'Asthma', status: 'monitoring', lastVisit: '3 days ago' },
  { name: 'Mike Johnson', condition: 'Obesity', status: 'progress', lastVisit: '5 days ago' },
]

const upcomingAppointments = [
  { time: '9:00 AM', patient: 'Jane Cooper', type: 'Follow-up', duration: '30 min' },
  { time: '10:00 AM', patient: 'John Smith', type: 'Check-up', duration: '45 min' },
  { time: '11:30 AM', patient: 'Sarah Wilson', type: 'Consultation', duration: '30 min' },
  { time: '2:00 PM', patient: 'Mike Johnson', type: 'Review', duration: '30 min' },
]

const alerts = [
  { patient: 'Jane Cooper', message: 'Blood sugar readings consistently high', priority: 'high' },
  { patient: 'John Smith', message: 'Missed last medication dose', priority: 'medium' },
  { patient: 'Sarah Wilson', message: 'Requested appointment change', priority: 'low' },
]

export default function DoctorDashboard() {
  const [doctorName, setDoctorName] = useState('Dr. Sarah Johnson')

  useEffect(() => {
    const storedName = localStorage.getItem('doctorName')
    if (storedName) setDoctorName(`Dr. ${storedName}`)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'stable':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
      case 'improving':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30'
      case 'monitoring':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30'
      case 'progress':
        return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30'
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20'
      case 'medium':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      case 'low':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
      default:
        return 'border-gray-300 bg-gray-50 dark:bg-gray-800'
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
            Welcome, {doctorName}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Here's your practice overview for today.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="stats-grid mb-8"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.1 }}
            >
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/30`}>
                    <stat.icon className={`w-6 h-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <div className="dashboard-grid gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Today's Schedule */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Today's Schedule
              </h2>
              <Card className="p-6">
                <div className="space-y-4">
                  {upcomingAppointments.map((appointment, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                          <Clock className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {appointment.time} - {appointment.patient}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {appointment.type} • {appointment.duration}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                          Scheduled
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            {/* Recent Patients */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Recent Patients
              </h2>
              <Card className="p-6">
                <div className="space-y-4">
                  {recentPatients.map((patient, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full">
                          <User className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {patient.name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {patient.condition} • Last visit: {patient.lastVisit}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.status)}`}>
                        {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Patient Alerts */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Patient Alerts
              </h2>
              <div className="space-y-3">
                {alerts.map((alert, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    <Card className={`p-4 border-l-4 ${getPriorityColor(alert.priority)}`}>
                      <div className="flex items-start space-x-3">
                        <AlertCircle className={`w-5 h-5 mt-0.5 ${
                          alert.priority === 'high' ? 'text-red-500' :
                          alert.priority === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                        }`} />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {alert.patient}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {alert.message}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                This Week
              </h2>
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Consultations</span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">42</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Recoveries</span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">18</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Follow-ups</span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">24</span>
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