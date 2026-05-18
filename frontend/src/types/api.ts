export interface ApiError {
  detail: string
  status_code?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
}

export interface Cycle {
  id: string
  name: string
  year: number
  goal_setting_open: string
  is_active: boolean
  created_at: string
}

export interface AuditLog {
  id: string
  entity_type: string
  entity_id: string
  entity_name?: string
  action: string
  changed_by_id: string
  changed_by_name: string
  changes?: Record<string, { old: unknown; new: unknown }>
  created_at: string
}

export interface EscalationRule {
  id: string
  name: string
  trigger_type: string
  days_threshold: number
  escalate_to: string
  is_active: boolean
  created_at: string
}

export interface EscalationLog {
  id: string
  employee_name: string
  rule_name: string
  escalated_to: string
  created_at: string
  status: 'sent' | 'resolved'
}

export interface WSEvent {
  type: string
  payload: Record<string, unknown>
  timestamp: string
}
