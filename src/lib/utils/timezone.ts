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
    
    // Simple approach: Use known timezone offsets
    // This handles most common timezones used by Shopify stores
    const timezoneOffsets: { [key: string]: number } = {
      'America/New_York': -5, // EST
      'America/Chicago': -6,  // CST
      'America/Denver': -7,   // MST
      'America/Los_Angeles': -8, // PST
      'America/Phoenix': -7,  // MST (no DST)
      'Europe/London': 0,     // GMT
      'Europe/Paris': 1,      // CET
      'Europe/Berlin': 1,     // CET
      'Asia/Tokyo': 9,        // JST
      'Australia/Sydney': 10, // AEST
      'Pacific/Auckland': 12, // NZST
    }
    
    // Get offset for timezone (default to EST if not found)
    let offsetHours = timezoneOffsets[storeTimezone] ?? -5
    
    // Adjust for daylight saving time if needed (simplified)
    const isDST = isDaylightSavingTime(targetDate, storeTimezone)
    if (isDST && storeTimezone !== 'America/Phoenix') {
      offsetHours += 1
    }
    
    // Create start and end dates in UTC
    const startUTC = new Date(`${dateStr}T00:00:00.000Z`)
    startUTC.setHours(startUTC.getHours() - offsetHours)
    
    const endUTC = new Date(`${dateStr}T23:59:59.999Z`)
    endUTC.setHours(endUTC.getHours() - offsetHours)
    
    // Local dates for display
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
 * Simple DST check for major timezones
 */
function isDaylightSavingTime(date: Date, timezone: string): boolean {
  const month = date.getMonth()
  const day = date.getDate()
  const dayOfWeek = date.getDay()
  
  // US DST: Second Sunday in March to first Sunday in November
  if (timezone.startsWith('America/')) {
    if (month < 2 || month > 10) return false // Jan, Feb, Dec
    if (month > 2 && month < 10) return true  // Apr-Oct
    
    // March: DST starts second Sunday
    if (month === 2) {
      const secondSunday = getNthSundayOfMonth(date.getFullYear(), 2, 2)
      return day >= secondSunday
    }
    
    // November: DST ends first Sunday
    if (month === 10) {
      const firstSunday = getNthSundayOfMonth(date.getFullYear(), 10, 1)
      return day < firstSunday
    }
  }
  
  // Europe DST: Last Sunday in March to last Sunday in October
  if (timezone.startsWith('Europe/')) {
    if (month < 2 || month > 9) return false
    if (month > 2 && month < 9) return true
    
    if (month === 2) {
      const lastSunday = getLastSundayOfMonth(date.getFullYear(), 2)
      return day >= lastSunday
    }
    
    if (month === 9) {
      const lastSunday = getLastSundayOfMonth(date.getFullYear(), 9)
      return day < lastSunday
    }
  }
  
  // No DST for most of Asia, Africa
  return false
}

function getNthSundayOfMonth(year: number, month: number, n: number): number {
  const firstDay = new Date(year, month, 1).getDay()
  const firstSunday = firstDay === 0 ? 1 : 8 - firstDay
  return firstSunday + (n - 1) * 7
}

function getLastSundayOfMonth(year: number, month: number): number {
  const lastDay = new Date(year, month + 1, 0).getDate()
  const lastDayOfWeek = new Date(year, month, lastDay).getDay()
  return lastDay - lastDayOfWeek
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