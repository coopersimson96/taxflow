'use client'

import { useState } from 'react'
import HeroPayoutCard from '@/components/analytics/HeroPayoutCard'

const samplePayoutData = {
  amount: 1847.25,
  currency: 'USD',
  taxToSetAside: 147.78,
  safeToSpend: 1699.47,
  orderCount: 14,
  date: 'October 12, 2025',
  dateRange: 'Today',
  isConfirmed: false
}

const sampleNoPayoutData = {
  amount: 1200.00,
  currency: 'USD', 
  taxToSetAside: 96.00,
  safeToSpend: 1104.00,
  orderCount: 8,
  date: 'October 13, 2025',
  dateRange: 'Tomorrow',
  isConfirmed: false
}

export default function TestHeroStates() {
  const [currentState, setCurrentState] = useState<'payout_received' | 'no_payout' | 'confirmed'>('payout_received')
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirmSetAside = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setCurrentState('confirmed')
    setIsLoading(false)
  }

  const handleUndo = async () => {
    setCurrentState('payout_received')
  }

  const getCurrentData = () => {
    if (currentState === 'no_payout') return sampleNoPayoutData
    return samplePayoutData
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8" style={{ backgroundColor: '#F3F3E4' }}>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Hero Card State Testing</h1>
          
          <div className="mb-6 flex space-x-4">
            <button
              onClick={() => setCurrentState('payout_received')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentState === 'payout_received' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Payout Received
            </button>
            <button
              onClick={() => setCurrentState('no_payout')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentState === 'no_payout' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              No Payout
            </button>
            <button
              onClick={() => setCurrentState('confirmed')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentState === 'confirmed' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Confirmed
            </button>
          </div>

          <div className="mb-4 text-sm text-gray-600">
            Current State: <span className="font-semibold">{currentState.replace('_', ' ').toUpperCase()}</span>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <HeroPayoutCard
            data={getCurrentData()}
            state={currentState}
            isLoading={isLoading}
            onConfirmSetAside={handleConfirmSetAside}
            onUndo={handleUndo}
          />
        </div>

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-w-2xl mx-auto">
          <div className="flex items-start space-x-2">
            <span className="text-yellow-600">⚠️</span>
            <div>
              <h4 className="font-semibold text-yellow-800">Testing Environment</h4>
              <p className="text-sm text-yellow-700">This test page will be removed after testing is complete.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}