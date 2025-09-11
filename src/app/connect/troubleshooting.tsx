'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'

export default function TroubleshootingGuide() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-blue-600 hover:text-blue-800 underline"
      >
        Having trouble connecting?
      </button>
      
      {isOpen && (
        <Card className="mt-4 p-4 bg-blue-50 border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">Troubleshooting Connection Issues</h4>
          
          <div className="space-y-3 text-sm text-blue-800">
            <div>
              <p className="font-medium">Getting a "421 Misdirected Request" error?</p>
              <ul className="ml-4 mt-1 list-disc">
                <li>Make sure you're using the correct store subdomain (without .myshopify.com)</li>
                <li>Clear your browser cookies for Shopify and try again</li>
                <li>Try using an incognito/private browser window</li>
              </ul>
            </div>
            
            <div>
              <p className="font-medium">Connection timing out?</p>
              <ul className="ml-4 mt-1 list-disc">
                <li>Check that your store is active and not in development mode</li>
                <li>Ensure you're logged into the correct Shopify account</li>
                <li>Verify the store hasn't been deleted or suspended</li>
              </ul>
            </div>
            
            <div>
              <p className="font-medium">Still having issues?</p>
              <p className="mt-1">
                Please contact support with your store domain and the exact error message you're seeing.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}