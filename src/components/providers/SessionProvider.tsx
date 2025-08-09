'use client'

import { ReactNode, createContext, useContext } from 'react'

interface SessionProviderProps {
  children: ReactNode
}

// Mock session context for testing
const SessionContext = createContext({
  data: null as any,
  status: 'unauthenticated' as 'loading' | 'authenticated' | 'unauthenticated'
})

export function useSession() {
  return useContext(SessionContext)
}

export default function SessionProvider({ children }: SessionProviderProps) {
  console.log('🔍 SessionProvider mounting (NEXTAUTH TEMPORARILY DISABLED)')
  
  // TEMPORARILY PROVIDE MOCK SESSION TO PREVENT BUILD ERRORS
  const mockSessionValue = {
    data: null as any,
    status: 'unauthenticated' as const
  }
  
  return (
    <SessionContext.Provider value={mockSessionValue}>
      {children}
    </SessionContext.Provider>
  )
}