/**
 * Timezone utilities for handling store-specific timezones
 */

export interface StoreTimezoneInfo {
  timezone: string
  offset: number
  isDST: boolean
}

/**
 * Get timezone info from integration credentials
 */
export function getStoreTimezone(integration: any): string {
  // Try to get timezone from various sources
  const timezone = 
    integration.credentials?.shopInfo?.timezone ||
    integration.credentials?.shopInfo?.shop?.timezone ||
    integration.organization?.settings?.timezone ||
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
  // Create date at midnight in store timezone
  const dateStr = targetDate.toISOString().split('T')[0] // YYYY-MM-DD
  
  // Create date string with time at midnight in store timezone
  const startLocalStr = `${dateStr}T00:00:00`
  const endLocalStr = `${dateStr}T23:59:59.999`
  
  // Parse as local time in store timezone
  const startLocal = new Date(startLocalStr)
  const endLocal = new Date(endLocalStr)
  
  // Convert to UTC using Intl.DateTimeFormat
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: storeTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  // Get offset for the specific date (handles DST)
  const startParts = formatter.formatToParts(startLocal)
  const endParts = formatter.formatToParts(endLocal)
  
  // Create UTC dates by calculating offset
  // Note: This is a simplified approach. For production, consider using a library like date-fns-tz
  const startUTC = new Date(`${dateStr}T00:00:00Z`)
  const endUTC = new Date(`${dateStr}T23:59:59.999Z`)
  
  // Adjust based on timezone offset
  const offsetMinutes = getTimezoneOffset(storeTimezone, targetDate)
  startUTC.setMinutes(startUTC.getMinutes() + offsetMinutes)
  endUTC.setMinutes(endUTC.getMinutes() + offsetMinutes)
  
  return {
    startUTC,
    endUTC,
    startLocal,
    endLocal,
    timezone: storeTimezone
  }
}

/**
 * Get timezone offset in minutes for a specific date
 * Positive offset means ahead of UTC (e.g., UTC+5 = 300)
 * Negative offset means behind UTC (e.g., UTC-5 = -300)
 */
function getTimezoneOffset(timezone: string, date: Date): number {
  try {
    // Create two dates: one in UTC and one in the target timezone
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }))
    
    // Calculate the difference in minutes
    return (utcDate.getTime() - tzDate.getTime()) / (1000 * 60)
  } catch (error) {
    console.error('Error calculating timezone offset:', error)
    // Default to EST offset if timezone is invalid
    return 300 // UTC-5
  }
}

/**
 * Format date in store timezone
 */
export function formatInStoreTimezone(date: Date, storeTimezone: string, format?: string): string {
  return date.toLocaleString('en-US', { 
    timeZone: storeTimezone,
    dateStyle: 'short',
    timeStyle: 'short'
  })
}