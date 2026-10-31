import { apiRequest } from './apiClient'
import type { Task } from './taskService'
import type { DatedExam } from './examService'
import type { Goal } from './goalService'
import type { SubjectColor } from './subjectService'

export interface DayMinutes { date: string; minutes: number }
export interface NameMinutes { name: string; minutes: number }
export interface SubjectMinutes extends NameMinutes { id: number; color: SubjectColor | null }
export interface LastSession { subject: string | null; topic: string | null; duration_minutes: number; studied_on: string }
export interface StatsSummary {
  total_minutes: number; today_minutes: number; week_minutes: number; month_minutes: number
  sessions_count: number; tasks_done: number; tasks_total: number
  topics_done: number; topics_total: number; streak_days: number
  daily: DayMinutes[]; by_subject: SubjectMinutes[]; by_topic: NameMinutes[]
  last_session: LastSession | null; upcoming_tasks: Task[]; upcoming_exams: DatedExam[]; goals: Goal[]
}

export const getStatsSummary = () => apiRequest<StatsSummary>('/stats/summary')
