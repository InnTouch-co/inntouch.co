import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

/**
 * PATCH /api/folios/[id]/adjustment
 * Update folio adjustment (super admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from users table
    const { data: currentUserData, error: userError } = await supabase
      .from('users')
      .select('id, role_id')
      .eq('email', authUser.email)
      .eq('is_deleted', false)
      .maybeSingle()

    if (userError || !currentUserData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is super admin
    if (currentUserData.role_id !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Super admin only' },
        { status: 403 }
      )
    }

    const { id: bookingId } = await params
    const body = await request.json()
    const { subtotal_amount, tax_amount, final_amount, pos_receipt_number, notes } = body

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      )
    }

    if (tax_amount === undefined || tax_amount === null || tax_amount < 0) {
      return NextResponse.json({ error: 'tax_amount is required and must be >= 0' }, { status: 400 })
    }

    if (subtotal_amount === undefined || final_amount === undefined) {
      return NextResponse.json({ error: 'subtotal_amount and final_amount are required' }, { status: 400 })
    }

    // Get the latest adjustment
    const { data: existingAdjustment, error: adjustmentError } = await supabase
      .from('folio_adjustments')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('is_deleted', false)
      .order('adjusted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (adjustmentError) {
      return NextResponse.json(
        { error: 'Error fetching adjustment' },
        { status: 500 }
      )
    }

    if (!existingAdjustment) {
      return NextResponse.json(
        { error: 'Adjustment not found' },
        { status: 404 }
      )
    }

    // Update the adjustment
    const { data: updatedAdjustment, error: updateError } = await supabase
      .from('folio_adjustments')
      .update({
        subtotal_amount,
        tax_amount,
        final_amount,
        pos_receipt_number: pos_receipt_number || null,
        notes: notes || null,
        adjusted_by: currentUserData.id,
        adjusted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingAdjustment.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update adjustment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Adjustment updated successfully',
      adjustment: updatedAdjustment,
    })
  } catch (error: any) {
    logger.error('Error updating folio adjustment:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to update adjustment',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

