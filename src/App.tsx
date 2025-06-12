import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { 
  AuthRequired, 
  ProfileRequired, 
  ParentGuardianRequired, 
  AdminRequired 
} from './components/ProtectedRoute'
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
import { QuickRegisterPage } from './pages/QuickRegisterPage'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminProgramsPage } from './pages/AdminProgramsPage'
import { AdminProgramForm } from './pages/AdminProgramForm'
import { AdminRegistrationsPage } from './pages/AdminRegistrationsPage'

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes (No Auth Required - Load Instantly) */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/programs" element={
          <>
            <Header />
            <main className="px-4 py-8">
              <ProgramsPage />
            </main>
          </>
        } />

        {/* Protected Routes (Auth Required - Use Loading Wrapper) */}
        <Route path="/dashboard" element={
          <AppLoadingWrapper>
            <AuthRequired>
              <Header />
              <main className="px-4 py-8">
                <DashboardPage />
              </main>
            </AuthRequired>
          </AppLoadingWrapper>
        } />

        {/* Participant Management Routes */}
        <Route path="/participants" element={
          <AppLoadingWrapper>
            <ParentGuardianRequired>
              <Header />
              <main className="px-4 py-8">
                <ParticipantsPage />
              </main>
            </ParentGuardianRequired>
          </AppLoadingWrapper>
        } />

        <Route path="/participants/new" element={
          <AppLoadingWrapper>
            <ParentGuardianRequired>
              <Header />
              <main className="px-4 py-8">
                <AddParticipantPage />
              </main>
            </ParentGuardianRequired>
          </AppLoadingWrapper>
        } />

        <Route path="/participants/:id/edit" element={
          <AppLoadingWrapper>
            <ParentGuardianRequired>
              <Header />
              <main className="px-4 py-8">
                <AddParticipantPage />
              </main>
            </ParentGuardianRequired>
          </AppLoadingWrapper>
        } />

        <Route path="/participants/:id/register" element={
          <AppLoadingWrapper>
            <ParentGuardianRequired>
              <Header />
              <main className="px-4 py-8">
                <QuickRegisterPage />
              </main>
            </ParentGuardianRequired>
          </AppLoadingWrapper>
        } />

        {/* Profile Required Routes */}
        <Route path="/programs/:programId/register" element={
          <AppLoadingWrapper>
            <ProfileRequired>
              <Header />
              <main className="px-4 py-8">
                <QuickRegisterPage />
              </main>
            </ProfileRequired>
          </AppLoadingWrapper>
        } />

        <Route path="/profile" element={
          <AppLoadingWrapper>
            <ProfileRequired>
              <Header />
              <main className="px-4 py-8">
                <ProfilePage />
              </main>
            </ProfileRequired>
          </AppLoadingWrapper>
        } />

        <Route path="/registrations" element={
          <AppLoadingWrapper>
            <ProfileRequired>
              <Header />
              <main className="px-4 py-8">
                <div>My Registrations Page</div>
              </main>
            </ProfileRequired>
          </AppLoadingWrapper>
        } />

        {/* Admin Routes */}
        <Route path="/admin" element={
          <AppLoadingWrapper>
            <AdminRequired>
              <Header />
              <main className="px-4 py-8">
                <AdminDashboard />
              </main>
            </AdminRequired>
          </AppLoadingWrapper>
        } />

        <Route path="/admin/programs" element={
          <AppLoadingWrapper>
            <AdminRequired>
              <Header />
              <main className="px-4 py-8">
                <AdminProgramsPage />
              </main>
            </AdminRequired>
          </AppLoadingWrapper>
        } />

        <Route path="/admin/programs/new" element={
          <AppLoadingWrapper>
            <AdminRequired>
              <Header />
              <main className="px-4 py-8">
                <AdminProgramForm />
              </main>
            </AdminRequired>
          </AppLoadingWrapper>
        } />

        <Route path="/admin/programs/:programId/edit" element={
          <AppLoadingWrapper>
            <AdminRequired>
              <Header />
              <main className="px-4 py-8">
                <AdminProgramForm />
              </main>
            </AdminRequired>
          </AppLoadingWrapper>
        } />

        <Route path="/admin/programs/:programId/registrations" element={
          <AppLoadingWrapper>
            <AdminRequired>
              <Header />
              <main className="px-4 py-8">
                <AdminRegistrationsPage />
              </main>
            </AdminRequired>
          </AppLoadingWrapper>
        } />

        <Route path="/admin/registrations" element={
          <AppLoadingWrapper>
            <AdminRequired>
              <Header />
              <main className="px-4 py-8">
                <AdminRegistrationsPage />
              </main>
            </AdminRequired>
          </AppLoadingWrapper>
        } />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App