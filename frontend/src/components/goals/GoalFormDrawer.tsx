import { useState, useEffect } from 'react'
import { X, Minus, Plus, Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Goal, GoalFormData, UomType } from '../../types/goal'
import { aiAPI } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { cn } from '../../lib/utils'

const THRUST_AREAS = [
  'Revenue Growth', 'Customer Satisfaction', 'Cost Optimization',
  'Quality', 'Innovation', 'People Development', 'Safety',
  'Compliance', 'Digital Transformation', 'Custom',
]

const UOM_OPTIONS: { type: UomType; title: string; example: string }[] = [
  { type: 'numeric_min', title: 'Numeric – Higher is Better', example: 'e.g., Sales Revenue' },
  { type: 'numeric_max', title: 'Numeric – Lower is Better', example: 'e.g., Defects, TAT' },
  { type: 'percentage_min', title: 'Percentage – Higher is Better', example: 'e.g., Satisfaction %' },
  { type: 'percentage_max', title: 'Percentage – Lower is Better', example: 'e.g., Error Rate %' },
  { type: 'timeline', title: 'Timeline – Date Based', example: 'e.g., Project delivery' },
  { type: 'zero_based', title: 'Zero-Based – Zero = Success', example: 'e.g., Safety incidents' },
]

const goalSchema = z.object({
  thrust_area: z.string().min(1, 'Thrust area is required'),
  custom_thrust_area: z.string().optional(),
  title: z.string().min(3, 'Title must be at least 3 characters').max(500),
  description: z.string().optional(),
  uom_type: z.string().min(1, 'Unit of measurement is required'),
  target_value: z.number().optional(),
  target_date: z.string().optional(),
  weightage: z.number().min(10, 'Min 10%').max(90, 'Max 90%'),
})

type FormData = z.infer<typeof goalSchema>

interface GoalFormDrawerProps {
  open: boolean
  onClose: () => void
  onSave: (data: GoalFormData) => void
  goal?: Goal | null
  remainingWeightage?: number
  isLoading?: boolean
}

export function GoalFormDrawer({ open, onClose, onSave, goal, remainingWeightage = 100, isLoading }: GoalFormDrawerProps) {
  const { user } = useAuthStore()
  const [aiSuggestions, setAiSuggestions] = useState<{ title: string; description?: string }[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [showAI, setShowAI] = useState(false)

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      thrust_area: '',
      title: '',
      description: '',
      uom_type: '',
      weightage: 20,
    },
  })

  useEffect(() => {
    if (goal) {
      reset({
        thrust_area: goal.thrust_area,
        title: goal.title,
        description: goal.description || '',
        uom_type: goal.uom_type,
        target_value: goal.target_value,
        target_date: goal.target_date,
        weightage: goal.weightage,
      })
    } else {
      reset({ thrust_area: '', title: '', description: '', uom_type: '', weightage: 20 })
    }
  }, [goal, reset, open])

  const thrustArea = watch('thrust_area')
  const uomType = watch('uom_type') as UomType
  const weightage = watch('weightage')
  const titleValue = watch('title')

  const onSubmit = (data: FormData) => {
    const finalThrustArea = data.thrust_area === 'Custom' ? (data.custom_thrust_area || 'Custom') : data.thrust_area
    onSave({
      thrust_area: finalThrustArea,
      title: data.title,
      description: data.description,
      uom_type: data.uom_type as UomType,
      target_value: data.target_value,
      target_date: data.target_date,
      weightage: data.weightage,
    })
  }

  const fetchAISuggestions = async () => {
    setAiLoading(true)
    try {
      const area = thrustArea === 'Custom' ? watch('custom_thrust_area') || '' : thrustArea
      const res = await aiAPI.suggestGoals(area, user?.role || 'employee', user?.department || 'General')
      setAiSuggestions(res.data.suggestions || [])
    } catch {
      setAiSuggestions([
        { title: 'Increase quarterly revenue by 15%', description: 'Focus on new client acquisition and upselling' },
        { title: 'Reduce customer support TAT by 30%', description: 'Streamline processes to respond faster' },
        { title: 'Launch 2 new product features', description: 'Prioritize user-requested improvements' },
      ])
    } finally {
      setAiLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-neutral-800">
            {goal ? 'Edit Goal' : 'New Goal'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Thrust Area */}
          <div>
            <label className="label-base">Thrust Area *</label>
            <select className={cn('input-base', errors.thrust_area && 'border-red-400')} {...register('thrust_area')}>
              <option value="">Select thrust area...</option>
              {THRUST_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            {errors.thrust_area && <p className="text-xs text-red-600 mt-1">{errors.thrust_area.message}</p>}
            {thrustArea === 'Custom' && (
              <input
                placeholder="Enter custom thrust area..."
                className="input-base mt-2"
                {...register('custom_thrust_area')}
              />
            )}
          </div>

          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-neutral-700">Goal Title *</label>
              <span className="text-xs text-neutral-400">{(titleValue || '').length}/500</span>
            </div>
            <input
              placeholder="e.g., Increase quarterly revenue by 15%"
              className={cn('input-base', errors.title && 'border-red-400')}
              {...register('title')}
            />
            {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="label-base">Description (optional)</label>
            <textarea
              placeholder="Add context or clarity about this goal..."
              className="input-base h-24 resize-none"
              {...register('description')}
            />
          </div>

          {/* UoM */}
          <div>
            <label className="label-base">How will success be measured? *</label>
            <div className="grid grid-cols-2 gap-2">
              {UOM_OPTIONS.map((opt) => (
                <label
                  key={opt.type}
                  className={cn(
                    'border rounded-lg px-3 py-2.5 cursor-pointer flex items-start gap-2.5 hover:border-primary-300 transition-all',
                    uomType === opt.type ? 'border-primary-500 bg-primary-50' : 'border-neutral-200'
                  )}
                >
                  <input
                    type="radio"
                    value={opt.type}
                    className="mt-0.5 hidden"
                    {...register('uom_type')}
                  />
                  <div className={cn('w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center',
                    uomType === opt.type ? 'border-primary-500 bg-primary-500' : 'border-neutral-300'
                  )}>
                    {uomType === opt.type && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-800 leading-tight">{opt.title}</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{opt.example}</p>
                  </div>
                </label>
              ))}
            </div>
            {errors.uom_type && <p className="text-xs text-red-600 mt-1">{errors.uom_type.message}</p>}
          </div>

          {/* Target Value */}
          {uomType && uomType !== 'zero_based' && (
            <div>
              <label className="label-base">
                {uomType === 'timeline' ? 'Target Date' : 'Target Value'}
              </label>
              {uomType === 'timeline' ? (
                <input type="date" className="input-base" {...register('target_date')} />
              ) : (
                <input
                  type="number"
                  placeholder="e.g., 100"
                  className="input-base"
                  {...register('target_value', { valueAsNumber: true })}
                />
              )}
            </div>
          )}

          {/* Weightage */}
          <div>
            <label className="label-base">Weightage % (Min 10%, Max 90%)</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setValue('weightage', Math.max(10, (weightage || 10) - 5))}
                className="p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min={10} max={90} step={5}
                className="input-base w-24 text-center text-lg font-bold"
                {...register('weightage', { valueAsNumber: true })}
              />
              <button
                type="button"
                onClick={() => setValue('weightage', Math.min(90, (weightage || 10) + 5))}
                className="p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              You have {remainingWeightage - (goal ? 0 : 0)}% remaining
            </p>
            {errors.weightage && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.weightage.message}
              </p>
            )}
          </div>

          {/* AI Suggest */}
          <div className="border-t border-neutral-100 pt-4">
            <button
              type="button"
              onClick={() => { setShowAI(!showAI); if (!showAI && aiSuggestions.length === 0) fetchAISuggestions() }}
              className="bg-gradient-to-r from-primary-500 to-teal-600 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all"
            >
              <Sparkles className="w-4 h-4" /> ✨ Get AI Suggestions
            </button>

            {showAI && (
              <div className="mt-3 space-y-2">
                {aiLoading ? (
                  <div className="flex items-center gap-2 text-sm text-neutral-500 py-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating suggestions...
                  </div>
                ) : aiSuggestions.map((s, i) => (
                  <div
                    key={i}
                    className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 hover:border-primary-400 hover:bg-primary-50/50 transition-all"
                  >
                    <p className="text-sm font-semibold text-neutral-800">{s.title}</p>
                    {s.description && <p className="text-xs text-neutral-500 mt-1">{s.description}</p>}
                    <button
                      type="button"
                      onClick={() => setValue('title', s.title)}
                      className="text-xs text-primary-600 font-semibold hover:underline mt-2"
                    >
                      Use This →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="border-t border-neutral-200 px-6 py-4 flex gap-3 flex-shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            type="submit"
            form=""
            disabled={isLoading}
            onClick={handleSubmit(onSubmit)}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Goal'}
          </button>
        </div>
      </div>
    </div>
  )
}
