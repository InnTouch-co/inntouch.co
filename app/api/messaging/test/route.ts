import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsAppMessage, verifyConnection } from '@/lib/messaging/twilio'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, message } = body

    if (!phone || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      )
    }

    const messageSid = await sendWhatsAppMessage(phone, message)

    return NextResponse.json({
      success: true,
      messageSid,
      type: 'whatsapp',
      message: 'WhatsApp message sent successfully',
    })
  } catch (error: any) {
    logger.error('Error in test messaging endpoint:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to send message',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Test Twilio connection
    const accountInfo = await verifyConnection()
    
    return NextResponse.json({
      success: true,
      message: 'Twilio connection verified',
      account: accountInfo,
    })
  } catch (error: any) {
    logger.error('Error verifying Twilio connection:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to verify Twilio connection',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

