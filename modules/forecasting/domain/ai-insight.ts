export type InsightSeverity = "critical" | "warning" | "info" | "positive"

export type AiInsight = {
  id:           string
  type:         "high_risk" | "stalled" | "revenue_risk" | "recommended_action" | "positive_signal"
  severity:     InsightSeverity
  title:        string
  description:  string
  opportunityId?: string
  opportunityName?: string
  estimatedImpact?: number   // COP
  actionLabel?:     string
}

export type AiRevenueInsights = {
  summary:          string
  insights:         AiInsight[]
  forecastScore:    number   // 0–100
  riskScore:        number   // 0–100
  generatedAt:      string
}
