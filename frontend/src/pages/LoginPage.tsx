import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, User, UserCheck, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import Header from '../components/Header'
import Button from '../components/Button'
import Input from '../components/Input'
import Card from '../components/Card'

type AuthMode = 'signin' | 'signup'
type UserRole = 'patient' | 'doctor'

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [role, setRole] = useState<UserRole>('patient')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const navigate = useNavigate()

  const generatePatientID = () => {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substr(2, 5)
    const prefix = 'PAT'
    return `${prefix}${timestamp}${random}`.toUpperCase()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setNotification(null)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))

    if (mode === 'signup' && role === 'patient') {
      const patientID = generatePatientID()
      
      setNotification({
        type: 'success',
        message: `🎉 Welcome, ${formData.fullName}! Your Patient ID: ${patientID}`
      })

      localStorage.setItem('patientID', patientID)
      localStorage.setItem('patientName', formData.fullName)

      setTimeout(() => {
        navigate('/patient-dashboard')
      }, 3000)
    } else if (mode === 'signup' && role === 'doctor') {
      setNotification({
        type: 'success',
        message: `👨‍⚕️ Welcome, Dr. ${formData.fullName}! Account created successfully.`
      })

      localStorage.setItem('doctorName', formData.fullName)

      setTimeout(() => {
        navigate('/doctor-dashboard')
      }, 3000)
    } else {
      // Sign in
      if (role === 'doctor') {
        const demoDoctorName = 'Sarah Johnson'
        localStorage.setItem('doctorName', demoDoctorName)
      } else {
        const demoPatientName = 'Jane Cooper'
        localStorage.setItem('patientName', demoPatientName)
      }

      setNotification({
        type: 'success',
        message: '✅ Signed in successfully. Redirecting...'
      })

      const destination = role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard'
      setTimeout(() => {
        navigate(destination)
      }, 1500)
    }

    setLoading(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Back to Home */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <Link
              to="/"
              className="inline-flex items-center space-x-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
          </motion.div>

          <Card hover={false} className="p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">
                {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
              </h1>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
                Choose a role and {mode === 'signin' ? 'sign in' : 'create a new account'}.
              </p>

              {/* Role Selection */}
              <div className="flex space-x-2 mb-8">
                <Button
                  type="button"
                  variant={role === 'patient' ? 'primary' : 'outline'}
                  onClick={() => setRole('patient')}
                  icon={User}
                  className="flex-1"
                >
                  Patient
                </Button>
                <Button
                  type="button"
                  variant={role === 'doctor' ? 'primary' : 'outline'}
                  onClick={() => setRole('doctor')}
                  icon={UserCheck}
                  className="flex-1"
                >
                  Doctor
                </Button>
              </div>

              {/* Auth Mode Toggle */}
              <div className="flex space-x-2 mb-8">
                <Button
                  type="button"
                  variant={mode === 'signin' ? 'primary' : 'outline'}
                  onClick={() => setMode('signin')}
                  className="flex-1"
                >
                  Sign In
                </Button>
                <Button
                  type="button"
                  variant={mode === 'signup' ? 'primary' : 'outline'}
                  onClick={() => setMode('signup')}
                  className="flex-1"
                >
                  Sign Up
                </Button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {mode === 'signup' && (
                  <Input
                    label="Full Name"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    required
                    icon={User}
                  />
                )}

                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  required
                  icon={Mail}
                />

                <div className="relative">
                  <Input
                    label="Password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    required
                    icon={Lock}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {mode === 'signup' && (
                  <div className="relative">
                    <Input
                      label="Confirm Password"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm your password"
                      required
                      icon={Lock}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  loading={loading}
                  size="lg"
                >
                  {mode === 'signin' ? 'Sign In' : 'Sign Up'}
                </Button>
              </form>

              {/* Notification */}
              {notification && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`mt-6 p-4 rounded-xl border-2 text-center ${
                    notification.type === 'success'
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                      : notification.type === 'error'
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                  }`}
                >
                  <p className="font-medium">{notification.message}</p>
                  {notification.type === 'success' && (
                    <div className="mt-3">
                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: '0%' }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 3, ease: 'linear' }}
                          className="h-full bg-gradient-to-r from-green-500 to-blue-500"
                        />
                      </div>
                      <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">
                        Redirecting to dashboard...
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          </Card>
        </div>
      </main>
    </div>
  )
}