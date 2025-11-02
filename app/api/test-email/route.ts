import { NextRequest, NextResponse } from 'next/server'
import { generateInvitationEmail } from '@/lib/auth/email'

/**
 * Test endpoint to check email configuration
 * GET /api/test-email
 */
export async function GET(request: NextRequest) {
  try {
    const emailContent = generateInvitationEmail({
      email: 'test@example.com',
      name: 'Test User',
      password: 'test123',
      role: 'Test Role',
    })

    const hasResendKey = !!process.env.RESEND_API_KEY
    const useEdgeFunction = process.env.USE_SUPABASE_EDGE_FUNCTION === 'true'
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

    return NextResponse.json({
      status: 'Email configuration check',
      emailContentGenerated: !!emailContent,
      hasResendApiKey: hasResendKey,
      resendApiKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 5) || 'NOT SET',
      useSupabaseEdgeFunction: useEdgeFunction,
      fromEmail,
      subject: emailContent.subject,
      htmlLength: emailContent.html.length,
      textLength: emailContent.text.length,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
      },
      nextSteps: hasResendKey 
        ? 'Configuration looks good! Try creating a user to send an email.'
        : 'RESEND_API_KEY not set. Add it to .env.local and restart server.',
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 })
  }
}

