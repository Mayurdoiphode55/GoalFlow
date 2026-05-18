export type UomType = 'numeric_min' | 'numeric_max' | 'percentage_min' | 'percentage_max' | 'timeline' | 'zero_based'
export type GoalSheetStatus = 'draft' | 'submitted' | 'approved' | 'returned' | 'locked'
export type QuarterStatus = 'not_started' | 'on_track' | 'completed'

export interface Goal {
  id: string
  sheet_id: string
  thrust_area: string
  title: string
  description?: string
  uom_type: UomType
  target_value?: number
  target_date?: string
  weightage: number
  manager_notes?: string
  quarter_statuses?: Record<string, QuarterStatus>
  created_at: string
  updated_at: string
}

export interface GoalSheet {
  id: string
  employee_id: string
  cycle_id: string
  status: GoalSheetStatus
  return_reason?: string
  submitted_at?: string
  approved_at?: string
  goals: Goal[]
  employee?: {
    id: string
    name: string
    email: string
    department?: string
  }
  total_weightage?: number
}

export interface GoalFormData {
  thrust_area: string
  title: string
  description?: string
  uom_type: UomType
  target_value?: number
  target_date?: string
  weightage: number
}

export interface AISuggestion {
  title: string
  description: string
  uom_type: UomType
  target_value?: number
  rationale?: string
}
