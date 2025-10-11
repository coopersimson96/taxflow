interface ExportableData {
  [key: string]: any
}

/**
 * Converts an array of objects to CSV format
 */
export function arrayToCSV(data: ExportableData[], headers?: string[]): string {
  if (!data || data.length === 0) return ''
  
  // Extract headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0])
  
  // Create CSV header row
  const headerRow = csvHeaders.map(h => `"${h}"`).join(',')
  
  // Create data rows
  const dataRows = data.map(row => {
    return csvHeaders.map(header => {
      const value = row[header]
      // Handle null/undefined
      if (value === null || value === undefined) return '""'
      // Handle strings with commas or quotes
      if (typeof value === 'string') {
        return `"${value.replace(/"/g, '""')}"`
      }
      // Handle dates
      if (value instanceof Date) {
        return `"${value.toLocaleDateString()}"`
      }
      // Handle other types
      return `"${value}"`
    }).join(',')
  }).join('\n')
  
  return `${headerRow}\n${dataRows}`
}

/**
 * Downloads CSV data as a file
 */
export function downloadCSV(csvContent: string, filename: string = 'export.csv'): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.display = 'none'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

/**
 * Exports payout data to CSV
 */
export function exportPayoutData(payouts: any[]): void {
  const exportData = payouts.map(payout => ({
    'Date': payout.date,
    'Payout Amount': payout.amount,
    'Tax Amount': payout.taxAmount,
    'Safe Amount': payout.amount - payout.taxAmount,
    'Status': payout.isSetAside ? 'Set Aside' : 'Pending',
    'Order Count': payout.orderCount,
    'Currency': payout.currency
  }))
  
  const csv = arrayToCSV(exportData)
  const filename = `tax-payouts-${new Date().toISOString().split('T')[0]}.csv`
  
  downloadCSV(csv, filename)
}

/**
 * Exports monthly tax summary to CSV
 */
export function exportMonthlyTaxSummary(data: any): void {
  const exportData = [{
    'Month': data.month,
    'Year': data.year,
    'Total Tax to Track': data.totalTaxToTrack,
    'Amount Set Aside': data.totalSetAside,
    'Amount Remaining': data.totalRemaining,
    'Completion %': data.completionPercentage,
    'Payout Count': data.payoutCount,
    'Average per Payout': data.averagePerPayout,
    'Currency': data.currency
  }]
  
  const csv = arrayToCSV(exportData)
  const filename = `tax-summary-${data.month}-${data.year}.csv`
  
  downloadCSV(csv, filename)
}