import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
// import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './prisma'

// Validate environment variables
const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

if (!googleClientId || !googleClientSecret) {
  console.error('Missing Google OAuth environment variables')
  console.error('GOOGLE_CLIENT_ID:', googleClientId ? 'Set' : 'Missing')
  console.error('GOOGLE_CLIENT_SECRET:', googleClientSecret ? 'Set' : 'Missing')
}

export const authOptions: NextAuthOptions = {
  // adapter: PrismaAdapter(prisma), // Temporarily disabled for hybrid approach
  providers: googleClientId && googleClientSecret ? [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ] : [],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
      }
      return session
    },
    async signIn({ user, account, profile }) {
      // TEMPORARILY DISABLED: Sync user to database via API route (avoids URL parsing issues)
      // This might be causing the session to hang in production
      console.log('🔍 NextAuth signIn callback called for:', user.email)
      
      if (false && user.email) { // DISABLED
        try {
          const response = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/sync-user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              image: user.image,
              googleId: account?.providerAccountId,
            }),
          })

          if (response.ok) {
            const result = await response.json()
            console.log('✅ User synced via API:', result.user.email)
          } else {
            console.error('❌ User sync API failed:', response.status)
          }
        } catch (error) {
          console.error('❌ User sync error:', error)
          // Don't fail sign-in if sync fails
        }
      }
      return true
    },
  },
  debug: true,
}