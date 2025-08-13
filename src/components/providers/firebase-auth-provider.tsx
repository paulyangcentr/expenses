'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      console.error('Error signing in:', error)
      throw error
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      console.log('Attempting to sign up with email:', email)
      const result = await createUserWithEmailAndPassword(auth, email, password)
      console.log('Sign up successful:', result.user.email)
    } catch (error: any) {
      console.error('Error signing up:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      
      // Provide more helpful error messages
      let userMessage = 'Sign up failed'
      if (error.code === 'auth/configuration-not-found') {
        userMessage = 'Firebase Authentication is not enabled. Please enable it in the Firebase console.'
      } else if (error.code === 'auth/email-already-in-use') {
        userMessage = 'An account with this email already exists.'
      } else if (error.code === 'auth/weak-password') {
        userMessage = 'Password should be at least 6 characters long.'
      } else if (error.code === 'auth/invalid-email') {
        userMessage = 'Please enter a valid email address.'
      }
      
      const enhancedError = new Error(userMessage) as any
      enhancedError.code = error.code
      throw enhancedError
    }
  }

  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (error) {
      console.error('Error resetting password:', error)
      throw error
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within a FirebaseAuthProvider')
  }
  return context
}
