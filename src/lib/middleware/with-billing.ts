import { NextRequest, NextResponse } from 'next/server'
import { requireActiveBilling, extractShopFromRequest } from './billing-check'

/**
 * Higher-order function that wraps API route handlers with billing enforcement
 */
export function withBilling<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse> | NextResponse
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    // Check billing before proceeding to the handler
    const billingResponse = await requireActiveBilling(request, extractShopFromRequest)
    
    if (billingResponse) {
      // Billing check failed, return the error response
      return billingResponse
    }
    
    // Billing is active, proceed to the original handler
    return handler(request, ...args)
  }
}

/**
 * Specific wrapper for analytics routes that commonly need billing
 */
export function withAnalyticsBilling<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse> | NextResponse
) {
  return withBilling(async (request: NextRequest, ...args: T) => {
    // Add analytics-specific headers
    const response = await handler(request, ...args)
    
    if (response.headers) {
      response.headers.set('x-feature', 'analytics')
      response.headers.set('x-billing-required', 'true')
    }
    
    return response
  })
}

/**
 * Middleware for routes that should have billing but allow limited access
 */
export function withGracefulBilling<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse> | NextResponse,
  limitedResponse?: () => NextResponse
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const billingResponse = await requireActiveBilling(request, extractShopFromRequest)
    
    if (billingResponse) {
      // If limited response is provided, use that instead of blocking
      if (limitedResponse) {
        const response = limitedResponse()
        response.headers.set('x-billing-status', 'limited')
        return response
      }
      
      // Otherwise block access
      return billingResponse
    }
    
    // Full access
    return handler(request, ...args)
  }
}