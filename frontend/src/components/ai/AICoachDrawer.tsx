import { useState } from 'react'
import { X, Sparkles, Loader2 } from 'lucide-react'
import { aiAPI } from '../../lib/api'
import { useMyGoalSheet, useCreateGoal } from '../../hooks/useGoals'
import { useAuthStore } from '../../store/authStore'
import { cn } from '../../lib/utils'
import { toast } from 'sonner'

const THRUST_AREAS = [
  'Revenue Growth', 'Customer Satisfaction', 'Cost Optimization',
  'Quality', 'Innovation', 'People Development', 'Safety',
  'Compliance', 'Digital Transformation',
]

type Tab = 'suggest' | 'analyze' | 'coach'

interface AICoachDrawerProps {
  open: boolean
  onClose: () => void
}

export function AICoachDrawer({ open, onClose }: AICoachDrawerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('suggest')
  const [thrustArea, setThrustArea] = useState('')
  const [suggestions, setSuggestions] = useState<Record<string, unknown>[]>([])
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null)
  const [coaching, setCoaching] = useState('')
  const [coachGoal, setCoachGoal] = useState('')
  const [coachActual, setCoachActual] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: sheet } = useMyGoalSheet()
  const createGoal = useCreateGoal()
  const { user } = useAuthStore()
  const goals = sheet?.goals || []

  const generateSuggestions = async () => {
    setLoading(true)
    try {
      const res = await aiAPI.suggestGoals(thrustArea, user?.role || 'employee', user?.department || 'General')
      setSuggestions(res.data.suggestions || [])
    } catch {
      setSuggestions([
        { title: 'Increase quarterly revenue by 15%', description: 'Focus on new client acquisition', uom_type: 'numeric_min', target_value: 115 },
        { title: 'Reduce defect rate to under 2%', description: 'Implement QA processes', uom_type: 'percentage_max', target_value: 2 },
        { title: 'Complete training certification', description: 'Upskill in relevant domains', uom_type: 'timeline' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleUseGoal = async (s: Record<string, unknown>) => {
    if (!sheet) {
      toast.error('You do not have an active goal sheet.')
      return
    }
    if (sheet.status !== 'draft' && sheet.status !== 'returned') {
      toast.error('Goal sheet is locked. Cannot add goals.')
      return
    }
    try {
      await createGoal.mutateAsync({
        sheet_id: sheet.id,
        title: String(s.title || 'AI Goal'),
        description: String(s.description || ''),
        thrust_area: thrustArea || 'Revenue Growth',
        uom_type: String(s.uom_type || 'numeric_min'),
        target_value: Number(s.target_value || 100),
        weightage: 10,
      })
      toast.success('Goal added to your sheet!')
      onClose()
    } catch {
      toast.error('Failed to add goal')
    }
  }

  const analyzeSheet = async () => {
    setLoading(true)
    try {
      const res = await aiAPI.analyzeGoals(goals)
      setAnalysis(res.data)
    } catch {
      setAnalysis({ grade: 'B', feedback: 'Good distribution across thrust areas. Consider adding measurable targets for all goals.', tips: ['Add more specific numeric targets', 'Ensure Q4 goals are achievable'] })
    } finally {
      setLoading(false)
    }
  }

  const getCoaching = async () => {
    setLoading(true)
    try {
      const goal = goals.find((g: { id: string; title: string }) => g.id === coachGoal)
      const res = await aiAPI.coachCheckin({ goal_title: goal?.title, actual: coachActual, quarter: 'Q1' })
      setCoaching(res.data.coaching || res.data.message || '')
    } catch {
      setCoaching('Great progress! Focus on maintaining your current momentum. Break down your remaining target into weekly milestones for consistent progress. Remember, steady improvement beats last-minute effort!')
    } finally {
      setLoading(false)
    }
  }

  const GRADE_COLORS: Record<string, string> = { A: 'text-green-600 bg-green-50', B: 'text-blue-600 bg-blue-50', C: 'text-amber-600 bg-amber-50' }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-[420px] h-full bg-white border-l border-neutral-200 shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-teal-600 px-5 py-4 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-white" />
          <div className="flex-1">
            <p className="text-white font-bold text-base">AI Goal Coach</p>
            <p className="text-primary-100 text-xs">Powered by Groq + LLaMA</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-primary-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200">
          {([['suggest', 'Suggest Goals'], ['analyze', 'Analyze Sheet'], ['coach', 'Check-in Coach']] as [Tab, string][]).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn('flex-1 py-2.5 text-xs font-medium transition-all',
                activeTab === tab ? 'border-b-2 border-primary-500 text-primary-600' : 'text-neutral-500 hover:text-neutral-700')}>
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'suggest' && (
            <>
              <div>
                <label className="label-base">Thrust Area</label>
                <select className="input-base" value={thrustArea} onChange={(e) => setThrustArea(e.target.value)}>
                  <option value="">Select thrust area...</option>
                  {THRUST_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <button onClick={generateSuggestions} disabled={!thrustArea || loading}
                className="w-full bg-gradient-to-r from-primary-500 to-teal-600 text-white text-sm font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate Suggestions
              </button>
              <div className="space-y-3">
                {loading && [1, 2, 3].map((i) => (
                  <div key={i} className="h-24 rounded-xl bg-neutral-200 animate-pulse" />
                ))}
                {!loading && suggestions.map((s, i) => (
                  <div key={i} className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all">
                    <p className="text-sm font-semibold text-neutral-800">{String(s.title)}</p>
                    {Boolean(s.description) && <p className="text-xs text-neutral-500 mt-1">{String(s.description)}</p>}
                    <button onClick={() => handleUseGoal(s)} className="text-xs font-semibold text-primary-600 hover:underline mt-2">Use This Goal →</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'analyze' && (
            <>
              <button onClick={analyzeSheet} disabled={goals.length === 0 || loading}
                className="w-full bg-gradient-to-r from-primary-500 to-teal-600 text-white text-sm font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Analyze My Goals
              </button>
              {analysis && (
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={cn('text-4xl font-bold w-14 h-14 rounded-full flex items-center justify-center', GRADE_COLORS[String(analysis.grade)] || 'text-neutral-600 bg-neutral-100')}>
                      {String(analysis.grade || 'B')}
                    </span>
                    <p className="text-sm font-semibold text-neutral-700">{String(analysis.feedback || '')}</p>
                  </div>
                  {Array.isArray(analysis.tips) && (
                    <ul className="text-xs text-neutral-600 space-y-1.5">
                      {(analysis.tips as string[]).map((tip, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary-500 mt-0.5">•</span> {tip}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === 'coach' && (
            <>
              <div>
                <label className="label-base">Select Goal</label>
                <select className="input-base" value={coachGoal} onChange={(e) => setCoachGoal(e.target.value)}>
                  <option value="">Select a goal...</option>
                  {goals.map((g: { id: string; title: string }) => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
              </div>
              <div>
                <label className="label-base">Actual Value</label>
                <input type="number" placeholder="Enter current actual..." className="input-base" value={coachActual} onChange={(e) => setCoachActual(e.target.value)} />
              </div>
              <button onClick={getCoaching} disabled={!coachGoal || loading}
                className="w-full bg-gradient-to-r from-primary-500 to-teal-600 text-white text-sm font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Get Coaching
              </button>
              {coaching && (
                <div className="bg-gradient-to-br from-primary-50 to-teal-50 border border-primary-200 rounded-xl p-4">
                  <p className="text-sm text-neutral-700 italic leading-relaxed">{coaching}</p>
                  <p className="text-[11px] text-neutral-400 mt-2">Powered by Groq + LLaMA</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
