import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateRoom } from '@/lib/database/rooms'
import { logger } from '@/lib/utils/logger'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { room_id, status } = body

    if (!room_id || !status) {
      return NextResponse.json(
        { error: 'room_id and status are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate status
    const validStatuses = ['available', 'occupied', 'cleaning', 'maintenance']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: available, occupied, cleaning, maintenance' },
        { status: 400 }
      )
    }

    // Update room status
    await updateRoom(room_id, { status })

    return NextResponse.json({
      success: true,
      message: `Room status updated to ${status}`,
    })
  } catch (error: any) {
    logger.error('Error updating room status:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to update room status',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

