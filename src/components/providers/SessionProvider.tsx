'use client'

import { ReactNode } from 'react'

interface SessionProviderProps {
  children: ReactNode
}

export default function SessionProvider({ children }: SessionProviderProps) {
  console.log('🔍 SessionProvider mounting (NEXTAUTH TEMPORARILY DISABLED)')
  
  // TEMPORARILY DISABLE NEXTAUTH TO TEST IF IT'S CAUSING THE JS EXECUTION ISSUE
  return (
    <>
      {children}
    </>
  )
}