import { Routes, Route } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'

// Import pages
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import PatientDashboard from './pages/PatientDashboard'
import DoctorDashboard from './pages/DoctorDashboard'
import AppointmentsPage from './pages/AppointmentsPage'
import RequestAppointmentPage from './pages/RequestAppointmentPage'
import PatientCarePlansPage from './pages/PatientCarePlansPage'
import CarePlansPage from './pages/CarePlansPage'
import RecordsPage from './pages/RecordsPage'
import DownloadRecordsPage from './pages/DownloadRecordsPage'
import LogBloodSugarPage from './pages/LogBloodSugarPage'
import MessageDoctorPage from './pages/MessageDoctorPage'
import DoctorMessagesPage from './pages/DoctorMessagesPage'
import PatientsPage from './pages/PatientsPage'
import ContactPage from './pages/ContactPage'

// Page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  in: {
    opacity: 1,
    y: 0,
  },
  out: {
    opacity: 0,
    y: -20,
  },
}

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.4,
}

function AnimatedRoute({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  )
}

function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <AnimatedRoute>
                <HomePage />
              </AnimatedRoute>
            }
          />
          <Route
            path="/login"
            element={
              <AnimatedRoute>
                <LoginPage />
              </AnimatedRoute>
            }
          />
          <Route
            path="/patient-dashboard"
            element={
              <AnimatedRoute>
                <PatientDashboard />
              </AnimatedRoute>
            }
          />
          <Route
            path="/doctor-dashboard"
            element={
              <AnimatedRoute>
                <DoctorDashboard />
              </AnimatedRoute>
            }
          />
          <Route
            path="/appointments"
            element={
              <AnimatedRoute>
                <AppointmentsPage />
              </AnimatedRoute>
            }
          />
          <Route
            path="/request-appointment"
            element={
              <AnimatedRoute>
                <RequestAppointmentPage />
              </AnimatedRoute>
            }
          />
          <Route
            path="/patient-care-plans"
            element={
              <AnimatedRoute>
                <PatientCarePlansPage />
              </AnimatedRoute>
            }
          />
          <Route
            path="/care-plans"
            element={
              <AnimatedRoute>
                <CarePlansPage />
              </AnimatedRoute>
            }
          />
          <Route
            path="/records"
            element={
              <AnimatedRoute>
                <RecordsPage />
              </AnimatedRoute>
            }
          />
          <Route
            path="/download-records"
            element={
              <AnimatedRoute>
                <DownloadRecordsPage />
              </AnimatedRoute>
            }
          />
          <Route
            path="/log-blood-sugar"
            element={
              <AnimatedRoute>
                <LogBloodSugarPage />
              </AnimatedRoute>
            }
          />
          <Route
            path="/message-doctor"
            element={
              <AnimatedRoute>
                <MessageDoctorPage />
              </AnimatedRoute>
            }
          />
          <Route
            path="/doctor-messages"
            element={
              <AnimatedRoute>
                <DoctorMessagesPage />
              </AnimatedRoute>
            }
          />
          <Route
            path="/patients"
            element={
              <AnimatedRoute>
                <PatientsPage />
              </AnimatedRoute>
            }
          />
          <Route
            path="/contact"
            element={
              <AnimatedRoute>
                <ContactPage />
              </AnimatedRoute>
            }
          />
        </Routes>
      </AnimatePresence>
    </div>
  )
}

export default App