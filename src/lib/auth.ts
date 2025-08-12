import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import EmailProvider from 'next-auth/providers/email'
import { prisma } from './db'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
    }
  }
}

export const authOptions: NextAuthOptions = {
  // Temporarily disable adapter until database is properly configured
  // adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
        secure: false, // For development
        tls: {
          rejectUnauthorized: false
        }
      },
      from: process.env.EMAIL_SERVER_USER,
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        console.log('Sending verification email to:', identifier)
        console.log('Verification URL:', url)
        
        // For now, just log the URL instead of sending email
        // This allows testing without email setup
        console.log('Email would be sent to:', identifier)
        console.log('With URL:', url)
      }
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
  },
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
      }
      return token
    },
    async signIn({ user, account, profile }) {
      // Allow all sign-ins for now
      return true
    },
  },
}
