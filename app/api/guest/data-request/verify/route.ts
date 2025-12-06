import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/guest/data-request/verify
 * Verify a data request using the verification token
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Find the data request by verification token
    const { data: dataRequest, error: fetchError } = await supabase
      .from('data_requests')
      .select('id, verified, status, request_type, created_at')
      .eq('verification_token', token)
      .eq('is_deleted', false)
      .single()

    if (fetchError || !dataRequest) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 404 }
      )
    }

    // Check if already verified
    if (dataRequest.verified) {
      return NextResponse.json({
        success: true,
        message: 'This request has already been verified.',
        verified: true,
      })
    }

    // Check if token is expired (7 days)
    const createdAt = new Date(dataRequest.created_at)
    const now = new Date()
    const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceCreation > 7) {
      return NextResponse.json(
        {
          error: 'Verification token has expired. Please submit a new request.',
          expired: true,
        },
        { status: 400 }
      )
    }

    // Update the request to verified
    const { data: updatedRequest, error: updateError } = await supabase
      .from('data_requests')
      .update({
        verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dataRequest.id)
      .select()
      .single()

    if (updateError) {
      logger.error('Error verifying data request:', updateError)
      throw updateError
    }

    logger.info(`Data request ${dataRequest.id} verified successfully`)

    // Redirect to a success page or return JSON
    const requestTypeLabels: Record<string, string> = {
      access: 'Data Access',
      deletion: 'Data Deletion',
      portability: 'Data Portability',
      rectification: 'Data Rectification',
    }

    return NextResponse.json({
      success: true,
      message: `Your ${requestTypeLabels[dataRequest.request_type] || dataRequest.request_type} request has been verified successfully. We will process it within 30 days.`,
      verified: true,
      request_id: dataRequest.id,
    })
  } catch (error: any) {
    logger.error('Error verifying data request:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to verify request',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

