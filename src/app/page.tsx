import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Dashboard } from '@/components/dashboard'

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  // Temporarily bypass authentication for testing
  // if (!session) {
  //   redirect('/auth/signin')
  // }

  return <Dashboard />
}
