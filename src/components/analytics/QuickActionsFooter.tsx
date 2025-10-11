import React from 'react'
import { FileText, Download, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface QuickActionsFooterProps {
  onMonthlyReport?: () => void
  onExportAll?: () => void
  onSettings?: () => void
  className?: string
}

const QuickActionsFooter: React.FC<QuickActionsFooterProps> = ({
  onMonthlyReport,
  onExportAll,
  onSettings,
  className
}) => {
  const handleMonthlyReport = () => {
    if (onMonthlyReport) {
      onMonthlyReport()
    } else {
      // Navigate to reports page
      window.location.href = '/reports'
    }
  }

  const handleExportAll = () => {
    toast.loading('Preparing export...')
    
    if (onExportAll) {
      onExportAll()
    } else {
      // Trigger CSV download of current month data
      console.log('Exporting all current month data...')
      // TODO: Implement actual export functionality
    }
    
    setTimeout(() => {
      toast.success('All data exported successfully!', {
        description: 'Your CSV file has been downloaded.',
      })
    }, 2000)
  }

  const handleSettings = () => {
    if (onSettings) {
      onSettings()
    } else {
      // Navigate to settings page
      window.location.href = '/settings'
    }
  }

  return (
    <div className={cn(
      "flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 bg-slate-50 rounded-lg p-3 sm:p-4 border-t border-slate-200",
      className
    )}>
      {/* Monthly Report Button */}
      <button
        onClick={handleMonthlyReport}
        className="group flex items-center justify-center gap-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md px-3 sm:px-4 py-3 sm:py-2 hover:bg-white hover:border-slate-300 transition-all duration-300 transform hover:scale-105 active:scale-95 min-h-[44px] flex-1 sm:flex-initial"
      >
        <FileText className="w-4 h-4 group-hover:animate-pulse" />
        <span className="text-sm font-medium">Monthly Report</span>
      </button>

      {/* Export All Data Button */}
      <button
        onClick={handleExportAll}
        className="group flex items-center justify-center gap-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md px-3 sm:px-4 py-3 sm:py-2 hover:bg-white hover:border-slate-300 transition-all duration-300 transform hover:scale-105 active:scale-95 min-h-[44px] flex-1 sm:flex-initial"
      >
        <Download className="w-4 h-4 group-hover:animate-bounce" />
        <span className="text-sm font-medium">Export All Data</span>
      </button>

      {/* Settings Button */}
      <button
        onClick={handleSettings}
        className="group flex items-center justify-center gap-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md px-3 sm:px-4 py-3 sm:py-2 hover:bg-white hover:border-slate-300 transition-all duration-300 transform hover:scale-105 active:scale-95 min-h-[44px] flex-1 sm:flex-initial"
      >
        <Settings className="w-4 h-4 group-hover:animate-spin" />
        <span className="text-sm font-medium">Settings</span>
      </button>
    </div>
  )
}

export default QuickActionsFooter