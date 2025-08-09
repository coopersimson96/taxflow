'use client'

import { useState } from 'react'

export default function SimpleDashboard() {
  console.log('🔍 SimpleDashboard component executing')
  
  const [count, setCount] = useState(0)
  
  return (
    <div style={{ padding: '20px', color: 'black', backgroundColor: 'white' }}>
      <script dangerouslySetInnerHTML={{
        __html: `console.log('🔍 SIMPLE DASHBOARD: Inline script executing');`
      }} />
      
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>Simple Dashboard Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <p>This tests React hooks and client-side functionality without authentication.</p>
        <p>Counter: <strong>{count}</strong></p>
        
        <button 
          onClick={() => {
            console.log('🔍 SIMPLE DASHBOARD: Button clicked, count:', count)
            setCount(count + 1)
          }}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#0066cc', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            marginRight: '10px',
            cursor: 'pointer'
          }}
        >
          Increment Counter
        </button>
        
        <button 
          onClick={() => {
            console.log('🔍 SIMPLE DASHBOARD: Alert button clicked')
            alert('React onClick handler working!')
          }}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#00aa00', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test Alert
        </button>
      </div>
      
      <div style={{ padding: '10px', backgroundColor: '#f5f5f5', border: '1px solid #ddd' }}>
        If you can click the buttons and see the counter increment, React hydration is working.
      </div>
    </div>
  )
}