export interface QoQDataPoint {
  quarter: string
  employee_score?: number
  team_avg?: number
  org_avg?: number
}

export interface HeatmapCell {
  department: string
  quarter: string
  completion_pct: number
}

export interface ThrustDistribution {
  thrust_area: string
  count: number
  percentage: number
}

export interface ManagerEffectiveness {
  manager_id: string
  manager_name: string
  team_size: number
  checkin_completion_pct: number
  avg_approval_days: number
  avg_score: number
}

export interface CompletionStats {
  total_employees: number
  sheets_submitted: number
  goals_approved: number
  checkins_completed: number
  departments: DepartmentStat[]
}

export interface DepartmentStat {
  department: string
  employee_count: number
  submitted: number
  approved: number
  q1_done: number
  q2_done: number
  q3_done: number
  q4_done: number
}
