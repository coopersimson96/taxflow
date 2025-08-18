/**
 * Timezone utilities for handling store-specific timezones
 */

/**
 * Get timezone from integration credentials
 */
export function getStoreTimezone(integration: any): string {
  // Try to get timezone from various sources
  const timezone = 
    integration?.credentials?.shopInfo?.timezone ||
    integration?.credentials?.shopInfo?.shop?.timezone ||
    integration?.organization?.settings?.timezone ||
    'America/New_York' // Default fallback
  
  return timezone
}

/**
 * Calculate date range for a specific date in store timezone
 * Returns UTC timestamps for start and end of day in store timezone
 */
export function getStoreDayRange(targetDate: Date, storeTimezone: string): {
  startUTC: Date
  endUTC: Date
  startLocal: Date
  endLocal: Date
  timezone: string
} {
  try {
    // Get the date string in YYYY-MM-DD format
    const year = targetDate.getFullYear()
    const month = String(targetDate.getMonth() + 1).padStart(2, '0')
    const day = String(targetDate.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    // For now, just return UTC dates with 24-hour offset
    // This is a temporary fix until we can properly handle timezones
    const startUTC = new Date(`${dateStr}T00:00:00.000Z`)
    const endUTC = new Date(`${dateStr}T23:59:59.999Z`)
    
    // Local dates for display (same as UTC for now)
    const startLocal = new Date(`${dateStr}T00:00:00`)
    const endLocal = new Date(`${dateStr}T23:59:59.999`)
    
    return {
      startUTC,
      endUTC,
      startLocal,
      endLocal,
      timezone: storeTimezone
    }
  } catch (error) {
    console.error('Error in getStoreDayRange:', error)
    // Fallback to simple UTC calculation
    const startUTC = new Date(targetDate)
    startUTC.setUTCHours(0, 0, 0, 0)
    
    const endUTC = new Date(targetDate)
    endUTC.setUTCHours(23, 59, 59, 999)
    
    return {
      startUTC,
      endUTC,
      startLocal: startUTC,
      endLocal: endUTC,
      timezone: storeTimezone
    }
  }
}

/**
 * Format date in store timezone
 */
export function formatInStoreTimezone(date: Date, storeTimezone: string, format?: string): string {
  try {
    return date.toLocaleString('en-US', { 
      timeZone: storeTimezone,
      dateStyle: 'short',
      timeStyle: 'short'
    })
  } catch (error) {
    // Fallback if timezone is invalid
    return date.toLocaleString('en-US', {
      dateStyle: 'short',
      timeStyle: 'short'
    })
  }
}