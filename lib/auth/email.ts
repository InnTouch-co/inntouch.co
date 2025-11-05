/**
 * Email utilities for sending user invitations
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export interface InvitationEmailData {
  email: string
  name: string
  password: string
  role: string
}

/**
 * Generate invitation email content
 */
export function generateInvitationEmail(data: InvitationEmailData): { subject: string; html: string; text: string } {
  const loginUrl = `${APP_URL}/login`
  
  const subject = 'Welcome to InnTouch - Your Account Has Been Created'

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to InnTouch</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <div style="background: white; width: 64px; height: 64px; border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
          <span style="color: #667eea; font-size: 28px; font-weight: bold;">IT</span>
        </div>
        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to InnTouch</h1>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hello ${data.name},</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          Your account has been created by the administrator. You can now sign in to the InnTouch hotel management system.
        </p>
        
        <div style="background: #f9fafb; border-left: 4px solid #667eea; padding: 16px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #111827;">Your Account Details:</p>
          <p style="margin: 4px 0;"><strong>Email:</strong> ${data.email}</p>
          <p style="margin: 4px 0;"><strong>Password:</strong> ${data.password}</p>
          <p style="margin: 4px 0;"><strong>Role:</strong> ${data.role}</p>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 24px;">
          <strong>⚠️ Important:</strong> Please change your password after your first login for security.
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${loginUrl}" style="display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Sign In to InnTouch
          </a>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          If you have any questions or need assistance, please contact your system administrator.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6b7280; font-size: 12px;">
        <p>© ${new Date().getFullYear()} InnTouch. All rights reserved.</p>
      </div>
    </body>
    </html>
  `

  const text = `
Welcome to InnTouch

Hello ${data.name},

Your account has been created by the administrator. You can now sign in to the InnTouch hotel management system.

Your Account Details:
Email: ${data.email}
Password: ${data.password}
Role: ${data.role}

IMPORTANT: Please change your password after your first login for security.

Sign in here: ${loginUrl}

If you have any questions or need assistance, please contact your system administrator.

© ${new Date().getFullYear()} InnTouch. All rights reserved.
  `.trim()

  return { subject, html, text }
}

/**
 * Send invitation email
 * Supports two methods:
 * 1. Supabase Edge Function (if USE_SUPABASE_EDGE_FUNCTION=true)
 * 2. Direct Resend API (default)
 */
export async function sendInvitationEmail(data: InvitationEmailData): Promise<void> {
  const emailContent = generateInvitationEmail(data)
  
  // Check if using Supabase Edge Function
  const useSupabaseEdgeFunction = process.env.USE_SUPABASE_EDGE_FUNCTION === 'true'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  
  if (useSupabaseEdgeFunction && supabaseUrl) {
    try {
      // Use Supabase Edge Function
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-invitation-email`
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: data.email,
          name: data.name,
          password: data.password,
          role: data.role,
          loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`Edge Function error: ${error.error || response.statusText}`)
      }

      const result = await response.json()
      console.log('✅ Invitation email sent via Supabase Edge Function to:', data.email)
      return
    } catch (error: any) {
      console.error('Error calling Supabase Edge Function:', error)
      throw new Error(`Failed to send email via Edge Function: ${error.message}`)
    }
  }
  
  // Fallback to direct Resend API
  const resendApiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.FROM_EMAIL || 'onboarding@resend.dev'
  
  if (!resendApiKey) {
    console.warn('⚠️ RESEND_API_KEY not set. Email will not be sent.')
    console.log('📧 Email would be sent to:', data.email)
    console.log('📧 Subject:', emailContent.subject)
    throw new Error('Email sending not configured. Please set RESEND_API_KEY or configure Supabase Edge Function.')
  }

  // Check if using test email (Resend test domain)
  const isTestMode = fromEmail.includes('@resend.dev') || fromEmail === 'onboarding@resend.dev'
  const verifiedTestEmail = process.env.RESEND_TEST_EMAIL || 'beksultanggd@gmail.com'
  
  // In test mode, redirect all emails to verified address
  const recipientEmail = isTestMode ? verifiedTestEmail : data.email
  
  if (isTestMode) {
    console.warn(`⚠️ Using test email address: ${fromEmail}`)
    console.warn(`⚠️ Test emails can only be sent to your verified email address (${verifiedTestEmail})`)
    console.warn(`⚠️ Original recipient: ${data.email} → Redirected to: ${recipientEmail}`)
    console.warn(`⚠️ To send to actual recipients, verify a domain at resend.com/domains and set RESEND_FROM_EMAIL`)
  }

  try {
    // Dynamically import Resend to avoid errors if not installed
    const { Resend } = await import('resend')
    const resend = new Resend(resendApiKey)
    
    console.log('📧 Attempting to send email to:', recipientEmail)
    console.log('📧 Using from email:', fromEmail)
    console.log('📧 Subject:', emailContent.subject)
    
    // If in test mode, update the email content to show the original recipient
    let finalHtml = emailContent.html
    let finalText = emailContent.text
    
    if (isTestMode && recipientEmail !== data.email) {
      const originalRecipientNote = `<div style="background: #fff3cd; border: 1px solid #ffc107; padding: 12px; margin-bottom: 20px; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #856404;">
          <strong>⚠️ Test Email:</strong> This email was originally intended for <strong>${data.email}</strong> but was redirected to your verified test address for development purposes.
        </p>
      </div>`
      // Insert the note right after the opening body tag
      finalHtml = finalHtml.replace(/<body[^>]*>/, (match) => `${match}${originalRecipientNote}`)
      finalText = `⚠️ TEST EMAIL: Originally intended for ${data.email}\n\n${finalText}`
    }
    
    // Add reply-to for better deliverability
    const replyTo = process.env.RESEND_REPLY_TO || 'noreply@inntouch.co'
    
    const result = await resend.emails.send({
      from: fromEmail,
      to: recipientEmail,
      replyTo: isTestMode ? undefined : replyTo, // Don't set reply-to in test mode
      subject: emailContent.subject,
      html: finalHtml,
      text: finalText,
      // Add headers to improve deliverability
      headers: {
        'X-Entity-Ref-ID': `invitation-${Date.now()}`,
      },
    })

    console.log('📧 Resend API response:', JSON.stringify(result, null, 2))

    if (result.error) {
      console.error('❌ Failed to send email:', result.error)
      
      // Provide helpful error message for domain verification issues
      const errorMessage = result.error.message || 'Unknown error'
      if (errorMessage.includes('only send testing emails') || errorMessage.includes('verify a domain')) {
        const helpfulError = `Email sending failed: ${errorMessage}\n\n` +
          `To fix this:\n` +
          `1. Your domain is verified in Resend ✓\n` +
          `2. Update your .env.local file with your verified domain email:\n` +
          `   RESEND_FROM_EMAIL=noreply@yourdomain.com\n` +
          `   (Replace 'yourdomain.com' with your actual verified domain)\n` +
          `3. Restart your development server (npm run dev)\n` +
          `4. Common verified domain formats:\n` +
          `   - noreply@yourdomain.com\n` +
          `   - hello@yourdomain.com\n` +
          `   - notifications@yourdomain.com`
        console.error('❌', helpfulError)
        throw new Error(helpfulError)
      }
      
      throw new Error(`Failed to send email: ${errorMessage}`)
    }

    if (result.data?.id) {
      console.log('✅ Invitation email sent successfully!')
      console.log('📧 Message ID:', result.data.id)
      console.log('📧 Recipient:', recipientEmail)
      if (isTestMode && recipientEmail !== data.email) {
        console.log('📧 Original intended recipient:', data.email)
      }
      console.log('📧 Check Resend dashboard: https://resend.com/emails')
      
      // Provide Gmail troubleshooting tips
      if (isTestMode && recipientEmail.includes('@gmail.com')) {
        console.log('\n📬 Gmail Troubleshooting Tips:')
        console.log('   1. Check SPAM folder (emails from test domains often go there)')
        console.log('   2. Check Promotions, Updates, or Social tabs (not just Primary)')
        console.log('   3. Search for: "Welcome to InnTouch" or "onboarding@resend.dev"')
        console.log('   4. Wait 5-10 minutes (Gmail sometimes delays test emails)')
        console.log('   5. Add onboarding@resend.dev to your Gmail contacts')
        console.log('   6. Check Gmail filters: Settings → Filters and Blocked Addresses')
        console.log('\n💡 For production: Verify your domain in Resend to avoid spam filtering')
      }
    } else {
      console.warn('⚠️ Email sent but no message ID returned. Check Resend dashboard.')
    }
    
    return
  } catch (error: any) {
    console.error('Error sending email:', error)
    
    // If Resend is not installed, provide helpful error
    if (error.message?.includes('Cannot find module') || error.code === 'MODULE_NOT_FOUND') {
      throw new Error('Resend package not installed. Run: npm install resend')
    }
    
    throw error
  }
}

