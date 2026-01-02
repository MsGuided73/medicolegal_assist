export interface MonitoringDashboard {
  dashboardId: string
  name: string
  audience: 'technical' | 'business' | 'executive'
  widgets: any[]
}

export const ProductionMonitoringDashboards: MonitoringDashboard[] = [
  {
    dashboardId: 'technical_operations',
    name: 'Technical Operations Dashboard',
    audience: 'technical',
    widgets: [
      {
        widgetId: 'system_uptime',
        title: 'System Uptime',
        query: 'uptime_percentage_24h'
      },
      {
        widgetId: 'error_rate_chart',
        title: 'Error Rates',
        query: 'error_rate_by_severity_1h'
      }
    ]
  },
  {
    dashboardId: 'business_metrics',
    name: 'Business Metrics Dashboard',
    audience: 'business',
    widgets: [
      {
        widgetId: 'daily_active_users',
        title: 'Daily Active Users'
      },
      {
        widgetId: 'cases_processed_today',
        title: 'Cases Processed Today'
      }
    ]
  }
]
