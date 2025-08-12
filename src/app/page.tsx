'use client'

import { useAuth } from '@/components/providers/firebase-auth-provider'
import { Dashboard } from '@/components/dashboard'
import { redirect } from 'next/navigation'

export default function HomePage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    redirect('/auth/signin')
  }

  return <Dashboard />
}
