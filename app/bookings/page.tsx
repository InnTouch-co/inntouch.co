'use client'

export const dynamic = 'force-dynamic'

export default function BookingsPage() {
  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Bookings</h2>
          <p className="text-sm text-gray-500">View and manage guest bookings, check-ins, and check-outs.</p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <p className="text-gray-500 text-center py-8">
          Bookings management interface coming soon. This will allow you to view and manage guest bookings, check-ins, and check-outs.
        </p>
      </div>
    </div>
  )
}

