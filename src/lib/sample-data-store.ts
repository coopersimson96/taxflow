/**
 * Shared Sample Data Store
 * 
 * This in-memory store provides consistent sample data across all APIs
 * and mirrors the pattern we'll use with the real database in production.
 * 
 * When we switch to Shopify data, we'll replace this with database calls
 * using the exact same interface patterns.
 */

interface PayoutStatus {
  id: string
  payoutId: string
  payoutDate: string
  payoutAmount: number
  taxAmount: number
  isSetAside: boolean
  setAsideAt?: string
  currency: string
}

interface DailyPayoutData {
  payoutAmount: number
  taxToSetAside: number
  safeToSpend: number
  orderCount: number
  currency: string
  date: string
  dateRange: string
  isSetAside: boolean
  hasPayoutToday: boolean
  payoutId?: string
}

interface PayoutItem {
  id: string
  date: string
  amount: number
  currency: string
  taxAmount: number
  isSetAside: boolean
  orderCount: number
}

// In-memory store that persists during the session
class SampleDataStore {
  private payoutStatuses: Map<string, PayoutStatus> = new Map()
  private dailyPayout: DailyPayoutData | null = null
  private recentPayouts: PayoutItem[] = []
  private initialized = false

  // Initialize with consistent sample data
  private initialize() {
    if (this.initialized) return

    const today = new Date()
    const todayString = today.toISOString()

    // Generate today's payout
    const seed = today.getDate()
    const baseAmount = 1500 + (seed * 47) % 1000
    const taxRate = 0.08 + (seed * 0.01) % 0.05
    const payoutAmount = Math.round(baseAmount * 100) / 100
    const taxToSetAside = Math.round(payoutAmount * taxRate * 100) / 100
    const payoutId = `sample_${today.toISOString().split('T')[0]}`

    this.dailyPayout = {
      payoutAmount,
      taxToSetAside,
      safeToSpend: payoutAmount - taxToSetAside,
      orderCount: 8 + (seed % 12),
      currency: 'USD',
      date: today.toLocaleDateString(),
      dateRange: 'Today',
      isSetAside: false,
      hasPayoutToday: true,
      payoutId
    }

    // Generate recent payouts (last 5 days within current month)
    // This ensures payouts are in the same month as the monthly tracking
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    
    for (let i = 0; i < 5; i++) {
      const payoutDate = new Date(today)
      payoutDate.setDate(payoutDate.getDate() - i)
      
      // If this would go to previous month, use current month days instead
      if (payoutDate.getMonth() !== currentMonth || payoutDate.getFullYear() !== currentYear) {
        // Generate payouts for earlier days in current month
        payoutDate.setFullYear(currentYear)
        payoutDate.setMonth(currentMonth)
        payoutDate.setDate(Math.max(1, today.getDate() - i))
      }
      
      const daySeeds = payoutDate.getDate() + i
      const dayAmount = 1000 + (daySeeds * 123) % 2000
      const dayTaxRate = 0.08 + ((daySeeds * 0.01) % 0.04)
      const dayTaxAmount = Math.round(dayAmount * dayTaxRate * 100) / 100
      const orderCount = 3 + (daySeeds % 8)
      
      const payoutItem: PayoutItem = {
        id: `sample_payout_${i}`,
        date: payoutDate.toISOString(),
        amount: Math.round(dayAmount * 100) / 100,
        currency: 'USD',
        taxAmount: dayTaxAmount,
        isSetAside: false, // Start with nothing set aside for clean demo
        orderCount
      }

      this.recentPayouts.push(payoutItem)
    }

    this.initialized = true
  }

  // Get today's daily payout data
  getDailyPayout(): DailyPayoutData | null {
    this.initialize()
    
    // Check if today's payout is marked as set aside
    if (this.dailyPayout?.payoutId) {
      const status = this.payoutStatuses.get(this.dailyPayout.payoutId)
      if (status) {
        this.dailyPayout.isSetAside = status.isSetAside
      }
    }
    
    return this.dailyPayout
  }

  // Get recent payouts with current status
  getRecentPayouts(): PayoutItem[] {
    this.initialize()
    
    // Update recent payouts with current status
    return this.recentPayouts.map(payout => ({
      ...payout,
      isSetAside: this.payoutStatuses.has(payout.id) ? this.payoutStatuses.get(payout.id)!.isSetAside : payout.isSetAside
    }))
  }

  // Mark a payout as set aside (simulates database update)
  setPayoutAsAside(payoutId: string): boolean {
    this.initialize()
    
    // Update daily payout if it matches
    if (this.dailyPayout?.payoutId === payoutId) {
      this.dailyPayout.isSetAside = true
    }

    // Find the payout in recent payouts
    const payout = this.recentPayouts.find(p => p.id === payoutId)
    if (!payout) return false

    // Update the payout status
    this.payoutStatuses.set(payoutId, {
      id: payoutId,
      payoutId,
      payoutDate: payout.date,
      payoutAmount: payout.amount,
      taxAmount: payout.taxAmount,
      isSetAside: true,
      setAsideAt: new Date().toISOString(),
      currency: payout.currency
    })

    return true
  }

  // Undo set aside status (simulates database update)
  undoSetAside(payoutId: string): boolean {
    this.initialize()
    
    // Update daily payout if it matches
    if (this.dailyPayout?.payoutId === payoutId) {
      this.dailyPayout.isSetAside = false
    }

    // Remove from payout statuses
    const removed = this.payoutStatuses.delete(payoutId)
    return removed
  }

  // Calculate monthly tracking data based on current statuses
  getMonthlyTracking(month: number, year: number): any {
    this.initialize()
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    // Use consistent seed for this month/year combo
    const seed = month + (year * 12)
    const basePayoutCount = 12 + (seed % 8)
    const averagePayout = 1200 + (seed * 47) % 800
    const totalPayouts = basePayoutCount * averagePayout
    
    // Tax rate between 8-12%
    const taxRate = 0.08 + ((seed * 0.01) % 0.04)
    const totalTaxToTrack = Math.round(totalPayouts * taxRate)
    
    // Calculate actual set aside amount from current statuses
    let actualSetAside = 0
    
    this.payoutStatuses.forEach(status => {
      const statusDate = new Date(status.payoutDate)
      if (statusDate.getMonth() + 1 === month && statusDate.getFullYear() === year) {
        actualSetAside += status.taxAmount
      }
    })
    
    // Add any recent payouts that are set aside for this month
    this.recentPayouts.forEach(payout => {
      const payoutDate = new Date(payout.date)
      if (payoutDate.getMonth() + 1 === month && payoutDate.getFullYear() === year && payout.isSetAside) {
        const existingStatus = this.payoutStatuses.get(payout.id)
        if (!existingStatus) {
          actualSetAside += payout.taxAmount
        }
      }
    })
    
    // Use actual set aside amount directly - this is the true state
    const totalSetAside = actualSetAside
    
    const totalRemaining = totalTaxToTrack - totalSetAside
    const completionPercentage = totalTaxToTrack > 0 ? (totalSetAside / totalTaxToTrack) * 100 : 0

    return {
      month: monthNames[month - 1],
      year,
      totalTaxToTrack,
      totalSetAside,
      totalRemaining,
      currency: 'USD',
      payoutCount: basePayoutCount,
      averagePerPayout: Math.round(averagePayout),
      completionPercentage: Math.round(completionPercentage * 100) / 100
    }
  }

  // Get all payout statuses (for debugging)
  getAllStatuses(): PayoutStatus[] {
    this.initialize()
    return Array.from(this.payoutStatuses.values())
  }

  // Reset store (for testing)
  reset(): void {
    this.payoutStatuses.clear()
    this.dailyPayout = null
    this.recentPayouts = []
    this.initialized = false
  }
}

// Export singleton instance
export const sampleDataStore = new SampleDataStore()