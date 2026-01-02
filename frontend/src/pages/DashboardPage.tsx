import { useCaseStats, useRecentCases } from '@/hooks/useDashboard'
import { useAuthStore } from '@/stores/authStore'
import StatCard from '@/components/dashboard/StatCard'
import RecentCasesList from '@/components/dashboard/RecentCasesList'
import {
  FileText,
  Calendar,
  AlertCircle,
  Clock,
  Plus,
} from 'lucide-react'
import { Link } from 'react-router-dom'

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const { data: stats, isLoading: statsLoading } = useCaseStats()
  const { data: cases = [], isLoading: casesLoading } = useRecentCases(10)

  return (
    <div className="space-y-6 text-left">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.full_name || 'Doctor'}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Here's what's happening with your cases today
          </p>
        </div>
        <Link
          to="/cases/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Case
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Cases"
          value={statsLoading ? '-' : stats?.total || 0}
          icon={FileText}
        />
        <StatCard
          title="In Progress"
          value={statsLoading ? '-' : stats?.by_status?.in_progress || 0}
          icon={Clock}
        />
        <StatCard
          title="Upcoming Exams"
          value={statsLoading ? '-' : stats?.upcoming_exams || 0}
          icon={Calendar}
        />
        <StatCard
          title="Overdue Reports"
          value={statsLoading ? '-' : stats?.overdue_reports || 0}
          icon={AlertCircle}
        />
      </div>

      {/* Status Breakdown */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Cases by Status
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.by_status || {}).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">
                    {status.replace('_', ' ')}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Cases by Priority
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.by_priority || {}).map(([priority, count]) => (
                <div key={priority} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">
                    {priority}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link
                to="/cases/new"
                className="block w-full px-4 py-2 text-sm text-center text-white bg-primary rounded-md hover:bg-primary/90"
              >
                Create New Case
              </Link>
              <Link
                to="/cases"
                className="block w-full px-4 py-2 text-sm text-center text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                View All Cases
              </Link>
              <Link
                to="/upload"
                className="block w-full px-4 py-2 text-sm text-center text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Upload Documents
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Recent Cases */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Recent Cases
          </h2>
          <Link
            to="/cases"
            className="text-sm font-medium text-primary hover:text-primary/80"
          >
            View all →
          </Link>
        </div>
        <RecentCasesList cases={cases} isLoading={casesLoading} />
      </div>
    </div>
  )
}
