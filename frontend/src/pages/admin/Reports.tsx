import { useState } from 'react'
import { BarChart2, CheckSquare, Loader2, Download } from 'lucide-react'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { reportsAPI } from '../../lib/api'
import { downloadBlob } from '../../lib/utils'
import { toast } from 'sonner'

export default function Reports() {
  const [achievementFormat, setAchievementFormat] = useState<'csv' | 'excel'>('csv')
  const [completionQuarter, setCompletionQuarter] = useState('Q1')
  const [downloadingAchievement, setDownloadingAchievement] = useState(false)
  const [downloadingCompletion, setDownloadingCompletion] = useState(false)
  const CYCLE_ID = 'current'

  const downloadAchievement = async () => {
    setDownloadingAchievement(true)
    try {
      const res = await reportsAPI.downloadAchievement(CYCLE_ID, achievementFormat)
      downloadBlob(res.data, `achievement-report.${achievementFormat === 'excel' ? 'xlsx' : 'csv'}`)
      toast.success('Report downloaded!')
    } catch {
      toast.error('Failed to download report')
    } finally {
      setDownloadingAchievement(false)
    }
  }

  const downloadCompletion = async () => {
    setDownloadingCompletion(true)
    try {
      const res = await reportsAPI.downloadCompletion(CYCLE_ID, completionQuarter)
      downloadBlob(res.data, `completion-report-${completionQuarter}.csv`)
      toast.success('Report downloaded!')
    } catch {
      toast.error('Failed to download report')
    } finally {
      setDownloadingCompletion(false)
    }
  }

  return (
    <PageWrapper>
      <h1 className="page-title mb-6">Reports</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Achievement Report */}
        <div className="card">
          <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mb-4">
            <BarChart2 className="w-6 h-6 text-primary-500" />
          </div>
          <h2 className="text-base font-semibold text-neutral-800 mb-1">Achievement Report</h2>
          <p className="text-sm text-neutral-500 mb-4">Export planned vs actual for all employees across all quarters</p>
          <div className="flex gap-2 mb-4">
            {(['csv', 'excel'] as const).map((fmt) => (
              <button key={fmt} onClick={() => setAchievementFormat(fmt)}
                className={achievementFormat === fmt ? 'btn-primary py-1.5 px-4 text-xs' : 'btn-secondary py-1.5 px-4 text-xs'}>
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={downloadAchievement} disabled={downloadingAchievement}
            className="btn-primary w-full flex items-center justify-center gap-2">
            {downloadingAchievement ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download Report
          </button>
        </div>

        {/* Completion Report */}
        <div className="card">
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mb-4">
            <CheckSquare className="w-6 h-6 text-green-500" />
          </div>
          <h2 className="text-base font-semibold text-neutral-800 mb-1">Completion Status Report</h2>
          <p className="text-sm text-neutral-500 mb-4">Export check-in completion status by employee and quarter</p>
          <div className="mb-4">
            <label className="label-base">Quarter</label>
            <select className="input-base" value={completionQuarter} onChange={(e) => setCompletionQuarter(e.target.value)}>
              {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
          <button onClick={downloadCompletion} disabled={downloadingCompletion}
            className="btn-primary w-full flex items-center justify-center gap-2">
            {downloadingCompletion ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download Report
          </button>
        </div>
      </div>
    </PageWrapper>
  )
}
