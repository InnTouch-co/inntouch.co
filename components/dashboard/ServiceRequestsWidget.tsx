'use client'

import { Card } from '@/components/ui/Card'
import { Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface ServiceRequestsWidgetProps {
  pending: number
  inProgress: number
  completedToday: number
  avgResponseMinutes: number
  loading?: boolean
}

export function ServiceRequestsWidget({
  pending,
  inProgress,
  completedToday,
  avgResponseMinutes,
  loading = false,
}: ServiceRequestsWidgetProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Service Requests</h3>
        <Link
          href="/service-requests"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View All
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-gray-700">Pending</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-red-600">{pending}</p>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-gray-700">In Progress</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{inProgress}</p>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Completed Today</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-green-600">{completedToday}</p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Avg Response</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {avgResponseMinutes > 0 ? `${avgResponseMinutes}m` : 'N/A'}
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}


