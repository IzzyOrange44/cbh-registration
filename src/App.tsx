import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Header } from './components/layout/Header'

// Import pages
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { SignUpPage } from './pages/SignUpPage'
import { DashboardPage } from './pages/DashboardPage'
import { ParticipantsPage } from './pages/ParticipantsPage'
import { ProgramsPage } from './pages/ProgramsPage'
import { ProfilePage } from './pages/ProfilePage'
import { CompleteProfilePage } from './pages/CompleteProfilePage'
import { QuickRegisterPage } from './pages/QuickRegisterPage'

function App() {
  return (
    <AuthProvider>
      <Router>
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
          
          {/* Protected routes */}
          <Route path="/complete-profile" element={
            <ProtectedRoute>
              <CompleteProfilePage />
            </ProtectedRoute>
          } />
          
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
                {/* Add your AddParticipantPage component here */}
                <div>Add Participant Page</div>
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
                <div>Admin Dashboard</div>
              </main>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App