'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'

interface SessionProviderProps {
  children: ReactNode
}

export default function SessionProvider({ children }: SessionProviderProps) {
  console.log('🔍 SessionProvider mounting')
  
  return (
    <NextAuthSessionProvider>
      {children}
    </NextAuthSessionProvider>
  )
}