import { Dashboard } from '@/components/dashboard'

export default async function HomePage() {
  // Temporarily bypass all authentication for testing
  return <Dashboard />
}
