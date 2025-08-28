'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to detect if the app is running in Shopify Admin embedded mode
 * Checks multiple conditions to determine embedding:
 * - embedded=1 URL parameter
 * - Running in iframe
 * - Session token in URL
 */
export function useEmbedded() {
  const [isEmbedded, setIsEmbedded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      // Check URL parameters
      const urlParams = new URLSearchParams(window.location.search)
      const embeddedParam = urlParams.get('embedded') === '1'
      const hasSessionToken = urlParams.has('session')
      
      // Check if running in iframe
      const inIframe = window.location !== window.parent.location || window.top !== window.self
      
      // Check for Shopify domain in referrer (if available)
      const isShopifyReferrer = document.referrer.includes('.shopify.com') || 
                               document.referrer.includes('shopify-admin')
      
      const embedded = embeddedParam || (inIframe && (hasSessionToken || isShopifyReferrer))
      
      setIsEmbedded(embedded)
      
      if (embedded) {
        console.log('🔗 App detected as embedded in Shopify Admin')
      }
      
    } catch (error) {
      console.warn('Error detecting embedded mode:', error)
      setIsEmbedded(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isEmbedded,
    isLoading,
    isStandalone: !isEmbedded && !isLoading
  }
}