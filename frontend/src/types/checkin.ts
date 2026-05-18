export type CheckInStatus = 'not_started' | 'on_track' | 'completed'

export interface CheckIn {
  id: string
  goal_id: string
  quarter: string
  status: CheckInStatus
  actual_value?: number
  actual_date?: string
  employee_notes?: string
  manager_comment?: string
  score?: number
  created_at: string
  updated_at: string
}

export interface CheckInFormData {
  goal_id: string
  quarter: string
  status: CheckInStatus
  actual_value?: number
  actual_date?: string
  employee_notes?: string
}
