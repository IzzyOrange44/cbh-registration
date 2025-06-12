import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-4xl mx-auto text-center">
          <div className="space-y-8 sm:space-y-12 lg:space-y-16">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-red-600 rounded-2xl flex items-center justify-center shadow-xl">
                <span className="text-2xl sm:text-3xl lg:text-4xl text-white">🍁</span>
              </div>
            </div>
            
            {/* Heading */}
            <div className="space-y-4 sm:space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-7xl xl:text-8xl font-bold text-slate-900 tracking-tight">
                Canadian Blind Hockey
              </h1>
              
              <p className="text-lg sm:text-xl lg:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-light">
                Empowering athletes through adaptive hockey programs that build skills, confidence, and community across Canada.
              </p>
            </div>

            {/* Primary CTAs */}
            <div className="pt-4 sm:pt-8">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                <Link
                  to="/signup"
                  className="w-full sm:w-auto px-8 sm:px-10 lg:px-12 py-4 sm:py-5 bg-red-600 text-white text-base sm:text-lg lg:text-xl font-semibold rounded-full shadow-lg hover:bg-red-700 hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-red-200"
                >
                  Create Account
                </Link>
                
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-8 sm:px-10 lg:px-12 py-4 sm:py-5 bg-white text-slate-900 border-2 border-slate-200 text-base sm:text-lg lg:text-xl font-semibold rounded-full shadow-lg hover:bg-slate-50 hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-slate-200"
                >
                  Sign In
                </Link>
              </div>
            </div>

            {/* Secondary Link */}
            <div className="pt-8 sm:pt-12">
              <Link
                to="/programs"
                className="text-slate-500 hover:text-slate-700 font-medium hover:underline transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-200 rounded px-2 py-1"
              >
                View Programs
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-slate-400">
              &copy; {new Date().getFullYear()} Canadian Blind Hockey. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default HomePage