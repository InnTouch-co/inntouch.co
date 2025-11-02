'use client'

export const dynamic = 'force-dynamic'

export default function RoomsPage() {
  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Rooms</h2>
          <p className="text-sm text-gray-500">Manage room inventory, status, and configurations per hotel.</p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <p className="text-gray-500 text-center py-8">
          Rooms management interface coming soon. This will allow you to manage room inventory, status, and configurations per hotel.
        </p>
      </div>
    </div>
  )
}

