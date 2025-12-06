import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/consent/cookies
 * Save cookie consent preferences
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      hotel_id,
      user_id,
      session_id,
      essential_cookies,
      analytics_cookies,
      marketing_cookies,
      functional_cookies,
      consent_given,
    } = body

    if (!hotel_id) {
      return NextResponse.json(
        { error: 'hotel_id is required' },
        { status: 400 }
      )
    }

    // Get current user if authenticated
    let currentUserId: string | null = null
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('email', authUser.email)
          .eq('is_deleted', false)
          .maybeSingle()
        
        if (userData) {
          currentUserId = userData.id
        }
      }
    } catch (error) {
      // Not authenticated, continue with session_id
    }

    // Get IP address and user agent
    // Try multiple headers and methods to get IP address
    // x-forwarded-for can contain multiple IPs, take the first one
    const forwardedFor = request.headers.get('x-forwarded-for')
    let ipAddress = forwardedFor?.split(',')[0]?.trim() ||
                   request.headers.get('x-real-ip') ||
                   request.headers.get('cf-connecting-ip') || // Cloudflare
                   request.headers.get('true-client-ip') || // Cloudflare Enterprise
                   request.headers.get('x-client-ip') ||
                   request.headers.get('x-forwarded') ||
                   null
    
    // In development, if no IP found, use localhost placeholder
    if (!ipAddress || ipAddress === 'unknown') {
      if (process.env.NODE_ENV === 'development') {
        ipAddress = '127.0.0.1 (localhost)'
      } else {
        ipAddress = 'unknown'
      }
    }
    
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Check if consent already exists
    let existingConsent = null
    if (currentUserId) {
      const { data } = await supabase
        .from('cookie_consents')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('hotel_id', hotel_id)
        .eq('is_deleted', false)
        .maybeSingle()
      
      existingConsent = data
    } else if (session_id) {
      const { data } = await supabase
        .from('cookie_consents')
        .select('id')
        .eq('session_id', session_id)
        .eq('hotel_id', hotel_id)
        .eq('is_deleted', false)
        .maybeSingle()
      
      existingConsent = data
    }

    const consentData = {
      hotel_id,
      user_id: currentUserId || user_id || null,
      session_id: session_id || null,
      essential_cookies: essential_cookies ?? true,
      analytics_cookies: analytics_cookies ?? false,
      marketing_cookies: marketing_cookies ?? false,
      functional_cookies: functional_cookies ?? false,
      consent_given: consent_given ?? true,
      consent_date: new Date().toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
      updated_at: new Date().toISOString(),
    }

    let result
    if (existingConsent) {
      // Update existing consent
      const { data, error } = await supabase
        .from('cookie_consents')
        .update(consentData)
        .eq('id', existingConsent.id)
        .select()
        .single()

      if (error) {
        logger.error('Error updating cookie consent:', error)
        throw error
      }
      result = data
    } else {
      // Create new consent
      const { data, error } = await supabase
        .from('cookie_consents')
        .insert(consentData)
        .select()
        .single()

      if (error) {
        logger.error('Error creating cookie consent:', error)
        // Check if table doesn't exist
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          throw new Error('Cookie consents table does not exist. Please run database migration 031_create_consent_tables.sql')
        }
        throw error
      }
      result = data
    }

    // Log to consent history
    if (existingConsent) {
      // Get previous values
      const { data: previousConsent } = await supabase
        .from('cookie_consents')
        .select('analytics_cookies, marketing_cookies, functional_cookies')
        .eq('id', existingConsent.id)
        .single()

      if (previousConsent) {
        // Log changes for each category
        const categories = ['analytics', 'marketing', 'functional'] as const
        for (const category of categories) {
          const prevKey = `${category}_cookies` as const
          const newKey = `${category}_cookies` as const
          if (previousConsent[prevKey] !== consentData[newKey]) {
            await supabase.from('consent_history').insert({
              user_id: currentUserId || user_id || null,
              hotel_id,
              consent_type: 'cookie',
              action: consentData[newKey] ? 'granted' : 'revoked',
              previous_value: previousConsent[prevKey],
              new_value: consentData[newKey],
              details: { category },
              ip_address: ipAddress,
              user_agent: userAgent,
            })
          }
        }
      }
    } else {
      // Log initial consent
      await supabase.from('consent_history').insert({
        user_id: currentUserId || user_id || null,
        hotel_id,
        consent_type: 'cookie',
        action: 'granted',
        new_value: true,
        details: {
          essential: consentData.essential_cookies,
          analytics: consentData.analytics_cookies,
          marketing: consentData.marketing_cookies,
          functional: consentData.functional_cookies,
        },
        ip_address: ipAddress,
        user_agent: userAgent,
      })
    }

    return NextResponse.json({
      success: true,
      consent: result,
    })
  } catch (error: any) {
    logger.error('Error saving cookie consent:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      fullError: error.toString(),
    })
    
    // Provide more specific error messages
    let errorMessage = error.message || 'Failed to save cookie consent'
    
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      errorMessage = 'Database table does not exist. Please run migration 031_create_consent_tables.sql'
    } else if (error.code === '23503') {
      errorMessage = 'Invalid hotel_id. Please check that the hotel exists.'
    } else if (error.code === '23505') {
      errorMessage = 'Consent record already exists.'
    }
    
    return NextResponse.json(
      {
        error: errorMessage,
        details: error.details || error.toString(),
        code: error.code,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/consent/cookies
 * Get cookie consent preferences
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get('hotel_id')
    const sessionId = searchParams.get('session_id')

    if (!hotelId) {
      return NextResponse.json(
        { error: 'hotel_id is required' },
        { status: 400 }
      )
    }

    // Get current user if authenticated
    let currentUserId: string | null = null
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('email', authUser.email)
          .eq('is_deleted', false)
          .maybeSingle()
        
        if (userData) {
          currentUserId = userData.id
        }
      }
    } catch (error) {
      // Not authenticated
    }

    // Find consent
    let query = supabase
      .from('cookie_consents')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('is_deleted', false)

    if (currentUserId) {
      query = query.eq('user_id', currentUserId)
    } else if (sessionId) {
      query = query.eq('session_id', sessionId)
    } else {
      return NextResponse.json({ consent: null })
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle()

    if (error) throw error

    return NextResponse.json({ consent: data })
  } catch (error: any) {
    logger.error('Error fetching cookie consent:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch cookie consent',
      },
      { status: 500 }
    )
  }
}

