'use client'

import { Card } from '@/components/ui/Card'
import { Home, CheckCircle, XCircle, Wrench } from 'lucide-react'
import Link from 'next/link'

interface RoomStatusWidgetProps {
  total: number
  available: number
  occupied: number
  maintenance: number
  loading?: boolean
}

export function RoomStatusWidget({
  total,
  available,
  occupied,
  maintenance,
  loading = false,
}: RoomStatusWidgetProps) {
  const availablePercent = total > 0 ? Math.round((available / total) * 100) : 0
  const occupiedPercent = total > 0 ? Math.round((occupied / total) * 100) : 0
  const maintenancePercent = total > 0 ? Math.round((maintenance / total) * 100) : 0

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Room Status</h3>
        <Link
          href="/rooms"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View All
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-200 animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Rooms</span>
              <span className="text-lg font-bold text-gray-900">{total}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Available</p>
                  <p className="text-xs text-gray-500">{availablePercent}% of total</p>
                </div>
              </div>
              <p className="text-xl font-bold text-green-600">{available}</p>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Home className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Occupied</p>
                  <p className="text-xs text-gray-500">{occupiedPercent}% of total</p>
                </div>
              </div>
              <p className="text-xl font-bold text-blue-600">{occupied}</p>
            </div>

            {maintenance > 0 && (
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Maintenance</p>
                    <p className="text-xs text-gray-500">{maintenancePercent}% of total</p>
                  </div>
                </div>
                <p className="text-xl font-bold text-yellow-600">{maintenance}</p>
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  )
}


