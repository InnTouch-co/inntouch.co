/**
 * Email utilities for guest data request verification
 */

import { logger } from '@/lib/utils/logger'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export interface DataRequestVerificationEmailData {
  email: string
  name: string
  requestType: 'access' | 'deletion' | 'portability' | 'rectification'
  verificationToken: string
  hotelName?: string
}

/**
 * Generate verification email content for data requests
 */
export function generateDataRequestVerificationEmail(
  data: DataRequestVerificationEmailData
): { subject: string; html: string; text: string } {
  const requestTypeLabels: Record<string, string> = {
    access: 'Data Access',
    deletion: 'Data Deletion',
    portability: 'Data Portability',
    rectification: 'Data Rectification',
  }

  const requestTypeLabel = requestTypeLabels[data.requestType] || data.requestType
  const verificationUrl = `${APP_URL}/guest/verify-data-request?token=${encodeURIComponent(data.verificationToken)}`

  const subject = `Verify Your ${requestTypeLabel} Request - InnTouch`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Data Request</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <div style="background: white; width: 64px; height: 64px; border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
          <span style="color: #667eea; font-size: 28px; font-weight: bold;">IT</span>
        </div>
        <h1 style="color: white; margin: 0; font-size: 28px;">Verify Your Request</h1>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hello ${data.name},</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          You recently submitted a <strong>${requestTypeLabel}</strong> request. To ensure the security of your personal data, please verify your email address by clicking the button below.
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            Verify Email Address
          </a>
        </div>
        
        <div style="background: #f9fafb; border-left: 4px solid #667eea; padding: 16px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #111827;">What happens next?</p>
          <p style="margin: 4px 0; font-size: 14px;">
            Once verified, your request will be reviewed by our team. We will process your request within 30 days as required by GDPR regulations.
          </p>
        </div>
        
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #856404;">
            <strong>⚠️ Security Notice:</strong> If you did not submit this request, please ignore this email. Your account remains secure.
          </p>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 32px; margin-bottom: 8px;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="font-size: 12px; color: #9ca3af; word-break: break-all; margin: 0;">
          ${verificationUrl}
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
        
        <p style="font-size: 12px; color: #6b7280; margin: 0;">
          This verification link will expire in 7 days. If you need assistance, please contact the hotel front desk.
        </p>
      </div>
    </body>
    </html>
  `

  const text = `
Verify Your ${requestTypeLabel} Request - InnTouch

Hello ${data.name},

You recently submitted a ${requestTypeLabel} request. To ensure the security of your personal data, please verify your email address by visiting the link below:

${verificationUrl}

What happens next?
Once verified, your request will be reviewed by our team. We will process your request within 30 days as required by GDPR regulations.

⚠️ Security Notice: If you did not submit this request, please ignore this email. Your account remains secure.

This verification link will expire in 7 days. If you need assistance, please contact the hotel front desk.
  `.trim()

  return { subject, html, text }
}

/**
 * Send verification email for data request
 */
export async function sendDataRequestVerificationEmail(
  data: DataRequestVerificationEmailData
): Promise<void> {
  if (!data.email) {
    logger.warn('Cannot send verification email: no email address provided')
    return
  }

  const emailContent = generateDataRequestVerificationEmail(data)

  // Check if Resend is configured
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    logger.warn('RESEND_API_KEY not configured. Email not sent.')
    logger.info('Would send verification email:', {
      to: data.email,
      subject: emailContent.subject,
    })
    return
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@inntouch.co'
  const isProduction = process.env.NODE_ENV === 'production'
  const isResendTestDomain = fromEmail.includes('@resend.dev')
  const forceTestMode = process.env.RESEND_FORCE_TEST_MODE === 'true'

  // Determine if we're in test mode
  const isTestMode = isResendTestDomain && (!isProduction || forceTestMode)
  const verifiedTestEmail = process.env.RESEND_TEST_EMAIL || 'beksultanggd@gmail.com'
  const recipientEmail = isTestMode ? verifiedTestEmail : data.email

  if (isTestMode) {
    logger.warn(`⚠️ Using test email address: ${fromEmail}`)
    logger.warn(`⚠️ Test emails can only be sent to your verified email address (${verifiedTestEmail})`)
    logger.warn(`⚠️ Original recipient: ${data.email} → Redirected to: ${recipientEmail}`)
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(resendApiKey)

    logger.info('📧 Sending data request verification email to:', recipientEmail)

    // If in test mode, update the email content to show the original recipient
    let finalHtml = emailContent.html
    let finalText = emailContent.text

    if (isTestMode && recipientEmail !== data.email) {
      const originalRecipientNote = `<div style="background: #fff3cd; border: 1px solid #ffc107; padding: 12px; margin-bottom: 20px; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #856404;">
          <strong>⚠️ Test Email:</strong> This email was originally intended for <strong>${data.email}</strong> but was redirected to your verified test address for development purposes.
        </p>
      </div>`
      finalHtml = finalHtml.replace(/<body[^>]*>/, (match) => `${match}${originalRecipientNote}`)
      finalText = `⚠️ TEST EMAIL: Originally intended for ${data.email}\n\n${finalText}`
    }

    const replyTo = process.env.RESEND_REPLY_TO || 'noreply@inntouch.co'

    const result = await resend.emails.send({
      from: fromEmail,
      to: recipientEmail,
      replyTo: isTestMode ? undefined : replyTo,
      subject: emailContent.subject,
      html: finalHtml,
      text: finalText,
      headers: {
        'X-Entity-Ref-ID': `data-request-verification-${Date.now()}`,
      },
    })

    if (result.error) {
      logger.error('Error sending verification email:', result.error)
      throw new Error(`Failed to send email: ${result.error.message}`)
    }

    logger.info('✅ Verification email sent successfully:', result.data?.id)
  } catch (error: any) {
    logger.error('Error sending verification email:', error)
    throw error
  }
}

