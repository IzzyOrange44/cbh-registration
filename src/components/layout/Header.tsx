import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export function Header() {
  const { user, signOut } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  useEffect(() => {
    if (user) {
      checkAdminStatus()
    } else {
      setIsAdmin(false)
    }
  }, [user])
  
  const checkAdminStatus = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user?.id)
      .single()
    
    setIsAdmin(data?.is_admin || false)
  }
  
  return (
    <header className="bg-black text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-3">
            <div className="bg-red-600 w-10 h-10 rounded-full flex items-center justify-center">
              <span className="text-2xl">🍁</span>
            </div>
            <div>
              <span className="text-xl font-bold">Canadian Blind Hockey</span>
              <span className="hidden sm:block text-xs text-red-400">Team Canada Registration</span>
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-8">
            {user ? (
              <>
                <Link to="/dashboard" className="hover:text-red-400 transition-colors">
                  Dashboard
                </Link>
                <Link to="/participants" className="hover:text-red-400 transition-colors">
                  Participants
                </Link>
                <Link to="/programs" className="hover:text-red-400 transition-colors">
                  Programs
                </Link>
                <Link to="/profile" className="hover:text-red-400 transition-colors">
                  Profile
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="hover:text-red-400 transition-colors">
                    Admin
                  </Link>
                )}
                <button 
                  onClick={() => signOut()} 
                  className="bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/programs" className="hover:text-red-400 transition-colors">
                  Programs
                </Link>
                <Link to="/login" className="hover:text-red-400 transition-colors">
                  Login
                </Link>
                <Link to="/signup" className="bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition-colors">
                  Sign Up
                </Link>
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded hover:bg-gray-800"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-gray-900">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {user ? (
              <>
                <Link 
                  to="/dashboard" 
                  className="block px-3 py-2 rounded hover:bg-gray-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/participants" 
                  className="block px-3 py-2 rounded hover:bg-gray-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Participants
                </Link>
                <Link 
                  to="/programs" 
                  className="block px-3 py-2 rounded hover:bg-gray-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Programs
                </Link>
                <Link 
                  to="/profile" 
                  className="block px-3 py-2 rounded hover:bg-gray-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile
                </Link>
                {isAdmin && (
                  <Link 
                    to="/admin" 
                    className="block px-3 py-2 rounded hover:bg-gray-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin
                  </Link>
                )}
                <button 
                  onClick={() => {
                    signOut()
                    setMobileMenuOpen(false)
                  }}
                  className="block w-full text-left px-3 py-2 rounded hover:bg-gray-800"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/programs" 
                  className="block px-3 py-2 rounded hover:bg-gray-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Programs
                </Link>
                <Link 
                  to="/login" 
                  className="block px-3 py-2 rounded hover:bg-gray-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link 
                  to="/signup" 
                  className="block px-3 py-2 rounded hover:bg-gray-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}