export interface User {
  id: string
  name: string
  email: string
  role: 'employee' | 'manager' | 'admin'
  department?: string
  manager_id?: string
  is_active?: boolean
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  user: User
}
