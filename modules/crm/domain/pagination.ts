export type ListQuery = {
  search: string | null
  page: number
  pageSize: number
  /** Optional: restrict to one company (used by the customer page). */
  companyId?: string | null
}

export type Paginated<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}
