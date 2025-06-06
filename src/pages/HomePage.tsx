import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-red-100 flex items-center justify-center px-4">
      <div className="text-center max-w-2xl space-y-8">
        <img
          src="/favicon.ico"
          alt="Team Canada Logo"
          className="mx-auto w-20 h-20 rounded-full shadow-lg"
        />

        <h1 className="text-5xl font-extrabold text-red-700 drop-shadow-sm">
          Welcome to Team Canada Connect
        </h1>
        <p className="text-lg text-gray-700">
          A unified platform for managing family accounts, participants, and national programs.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            to="/login"
            className="px-6 py-3 bg-red-600 text-white rounded-xl text-lg font-medium shadow-md hover:bg-red-700 transition"
          >
            Log In
          </Link>

          <Link
            to="/signup"
            className="px-6 py-3 bg-white text-red-700 border border-red-600 rounded-xl text-lg font-medium shadow-md hover:bg-red-50 transition"
          >
            Sign Up
          </Link>
        </div>

        <footer className="text-sm text-gray-500 pt-10">
          &copy; {new Date().getFullYear()} Team Canada. All rights reserved.
        </footer>
      </div>
    </div>
  )
}

export default HomePage
