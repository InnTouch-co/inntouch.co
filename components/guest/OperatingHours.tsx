'use client'

import { Service } from '@/lib/guest/types'
import { formatTime, getTodayHours } from '@/lib/guest/utils/serviceHelpers'

interface OperatingHoursProps {
  service: Service
}

export function OperatingHours({ service }: OperatingHoursProps) {
  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ]
  
  const todayHours = getTodayHours(service)
  
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
      <div className="p-4 bg-gray-900 rounded-xl">
        <p className="text-sm text-gray-300 mb-1">Today's Hours</p>
        <p className="text-lg font-semibold text-white">{todayHours}</p>
      </div>
      
      {service.hours && Object.keys(service.hours).length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-white mb-3">Weekly Schedule</h4>
          {days.map((day) => {
            const hours = service.hours[day.key]
            const isClosed = !hours || 
                           (hours as any)?.closed === true || 
                           !hours.open || 
                           !hours.close ||
                           hours.open === null || 
                           hours.close === null
            return (
              <div key={day.key} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0">
                <span className="text-gray-300">{day.label}</span>
                <span className="text-white font-medium">
                  {isClosed ? 'Closed' : `${formatTime(hours.open)} - ${formatTime(hours.close)}`}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

