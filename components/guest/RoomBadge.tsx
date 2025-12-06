'use client'

interface RoomBadgeProps {
  roomNumber: string
}

export function RoomBadge({ roomNumber }: RoomBadgeProps) {
  return (
    <div className="fixed top-4 left-4 z-40 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2l-7 7-7-7m7 7l-7-7" />
      </svg>
      <span className="text-white font-semibold">Room {roomNumber}</span>
    </div>
  )
}

