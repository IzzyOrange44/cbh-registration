import { useAuth } from '../contexts'

export function AppLoadingWrapper({ children }: { children: React.ReactNode }) {
  const { ready } = useAuth()

  if (!ready) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="bg-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-3xl">🍁</span>
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Canadian Blind Hockey...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
