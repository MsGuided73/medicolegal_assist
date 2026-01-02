import { Link } from 'react-router-dom'
import { formatDate } from '@/lib/utils'
import type { Case } from '@/types/case'

interface RecentCasesListProps {
  cases: Case[]
  isLoading: boolean
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  review: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-800',
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
}

export default function RecentCasesList({ cases, isLoading }: RecentCasesListProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (cases.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-center text-gray-500">No recent cases</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Case
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Patient
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Exam Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {cases.map((caseItem) => (
              <tr key={caseItem.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-left">
                  <Link
                    to={`/cases/${caseItem.id}`}
                    className="text-sm font-medium text-primary hover:text-primary/80"
                  >
                    {caseItem.case_number}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-left">
                  <div className="text-sm text-gray-900">
                    {caseItem.patient_first_name} {caseItem.patient_last_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-left">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[caseItem.status]}`}>
                    {caseItem.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-left">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${priorityColors[caseItem.priority]}`}>
                    {caseItem.priority}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-left">
                  {caseItem.exam_date ? formatDate(caseItem.exam_date) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
