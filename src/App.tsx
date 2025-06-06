
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLoadingWrapper } from './components/AppLoadingWrapper'
import { Header } from './components/layout/Header'

// Import pages
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { SignUpPage } from './pages/SignUpPage'
import { DashboardPage } from './pages/DashboardPage'
import { ParticipantsPage } from './pages/ParticipantsPage'
import { AddParticipantPage } from './pages/AddParticipantPage'
import { ProgramsPage } from './pages/ProgramsPage'
import { ProfilePage } from './pages/ProfilePage'
import { CompleteProfilePage } from './pages/CompleteProfilePage'
import { QuickRegisterPage } from './pages/QuickRegisterPage'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminProgramsPage } from './pages/AdminProgramsPage'
import { AdminProgramForm } from './pages/AdminProgramForm'
import { AdminRegistrationsPage } from './pages/AdminRegistrationsPage'

function App() {
  const { profileCompleted } = useAuth()

  return (
    <AuthProvider>
      <Router>
        <AppLoadingWrapper>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />

            <Route path="/" element={
              <>
                <Header />
                <HomePage />
              </>
            } />

            {/* Special handling for profile completion */}
            <Route path="/complete-profile" element={
              profileCompleted ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <ProtectedRoute>
                  <CompleteProfilePage />
                </ProtectedRoute>
              )
            } />

            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Header />
                <main className="px-4 py-8">
                  <DashboardPage />
                </main>
              </ProtectedRoute>
            } />

            <Route path="/participants" element={
              <ProtectedRoute>
                <Header />
                <main className="px-4 py-8">
                  <ParticipantsPage />
                </main>
              </ProtectedRoute>
            } />

            <Route path="/participants/new" element={
              <ProtectedRoute>
                <Header />
                <main className="px-4 py-8">
                  <AddParticipantPage />
                </main>
              </ProtectedRoute>
            } />

            <Route path="/programs" element={
              <>
                <Header />
                <main className="px-4 py-8">
                  <ProgramsPage />
                </main>
              </>
            } />

            <Route path="/programs/:programId/register" element={
              <ProtectedRoute>
                <Header />
                <main className="px-4 py-8">
                  <QuickRegisterPage />
                </main>
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute>
                <Header />
                <main className="px-4 py-8">
                  <ProfilePage />
                </main>
              </ProtectedRoute>
            } />

            <Route path="/registrations" element={
              <ProtectedRoute>
                <Header />
                <main className="px-4 py-8">
                  <div>My Registrations Page</div>
                </main>
              </ProtectedRoute>
            } />

            {/* Admin routes */}
            <Route path="/admin" element={
              <ProtectedRoute>
                <Header />
                <main className="px-4 py-8">
                  <AdminDashboard />
                </main>
              </ProtectedRoute>
            } />

            <Route path="/admin/programs" element={
              <ProtectedRoute>
                <Header />
                <main className="px-4 py-8">
                  <AdminProgramsPage />
                </main>
              </ProtectedRoute>
            } />

            <Route path="/admin/programs/new" element={
              <ProtectedRoute>
                <Header />
                <main className="px-4 py-8">
                  <AdminProgramForm />
                </main>
              </ProtectedRoute>
            } />

            <Route path="/admin/programs/:programId/edit" element={
              <ProtectedRoute>
                <Header />
                <main className="px-4 py-8">
                  <AdminProgramForm />
                </main>
              </ProtectedRoute>
            } />

            <Route path="/admin/programs/:programId/registrations" element={
              <ProtectedRoute>
                <Header />
                <main className="px-4 py-8">
                  <AdminRegistrationsPage />
                </main>
              </ProtectedRoute>
            } />

            <Route path="/admin/registrations" element={
              <ProtectedRoute>
                <Header />
                <main className="px-4 py-8">
                  <AdminRegistrationsPage />
                </main>
              </ProtectedRoute>
            } />
          </Routes>
        </AppLoadingWrapper>
      </Router>
    </AuthProvider>
  )
}

export default App
