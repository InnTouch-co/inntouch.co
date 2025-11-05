import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Optimized: Get user directly (getUser also refreshes session)
  // This reduces from 2 API calls to 1
  let authUser = null
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      // "Auth session missing" is expected when user is not logged in - not an error
      if (authError.message === 'Auth session missing!' || authError.message?.includes('session')) {
        // No session - this is normal for unauthenticated users, continue with normal flow
        authUser = null
      }
      // If fetch failed or network error, allow the request to proceed
      // The page will handle authentication on client side
      else if (authError.message?.includes('fetch') || authError.message?.includes('network')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Middleware] Network error during auth check, allowing request:', authError.message)
        }
        // Allow request to proceed - client-side will handle auth
        return response
      }
      // For other unexpected auth errors, log but don't block
      else {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Middleware] Auth error (non-critical):', authError.message)
        }
        // Treat as no user - continue with normal flow
        authUser = null
      }
    } else {
      authUser = user
    }
  } catch (error) {
    // Handle network/timeout errors gracefully
    if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('network'))) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Middleware] Network error during auth check, allowing request to proceed:', error.message)
      }
      // Allow request to proceed - client-side will handle auth
      return response
    }
    
    // For other errors, log but allow to proceed (fail open)
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Middleware] Unexpected error (non-critical):', error)
    }
    // Treat as no user - continue with normal flow
    authUser = null
  }
  
  // Check session expiration if we have a user
  if (authUser) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        const currentTime = Math.floor(Date.now() / 1000)
        const sessionExpiry = session.expires_at || 0
        
        // Check if session has expired
        if (sessionExpiry <= currentTime) {
          // Session expired, sign out
          await supabase.auth.signOut()
          const redirectUrl = new URL('/login', request.url)
          redirectUrl.searchParams.set('error', 'session_expired')
          return NextResponse.redirect(redirectUrl)
        }
      }
    } catch (error) {
      // If session check fails, continue with user check
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Middleware] Session check failed, continuing:', error)
      }
    }
  }

  const pathname = request.nextUrl.pathname

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/api/debug']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // If not authenticated and trying to access protected route, redirect to login
  if (!authUser && !isPublicRoute) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If authenticated and on login page, redirect to home
  if (authUser && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // If authenticated, check user exists and get role
  if (authUser && !isPublicRoute) {
    try {
      // Use .maybeSingle() or get first result to handle duplicates
      const { data: userDataArray, error: userError } = await supabase
        .from('users')
        .select('role_id, active, is_deleted')
        .eq('email', authUser.email)
        .eq('is_deleted', false)
        .limit(1)
      
      const userData = userDataArray?.[0]

      // Log for debugging (in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('[Middleware] User check:', {
          email: authUser.email,
          userData: userData,
          foundCount: userDataArray?.length || 0,
          error: userError?.message,
        })
      }

      // Handle network/database errors gracefully
      if (userError) {
        // If it's a network/fetch error, allow request to proceed
        if (userError.message?.includes('fetch') || userError.message?.includes('network')) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[Middleware] Database network error, allowing request:', userError.message)
          }
          return response
        }
        
        // For other database errors, redirect to login
        await supabase.auth.signOut()
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('error', `user_not_found: ${userError.message}`)
        return NextResponse.redirect(redirectUrl)
      }

      if (!userData || userData.is_deleted || !userData.active) {
        // User not found or inactive, sign out and redirect to login
        await supabase.auth.signOut()
        const redirectUrl = new URL('/login', request.url)
        if (!userData) {
          redirectUrl.searchParams.set('error', 'user_not_found')
        } else if (userData.is_deleted) {
          redirectUrl.searchParams.set('error', 'account_deleted')
        } else if (!userData.active) {
          redirectUrl.searchParams.set('error', 'account_inactive')
        }
        return NextResponse.redirect(redirectUrl)
      }

      const userRole = userData.role_id

      // Role-based routing
      // Hotel admins should go to /admin/hotel instead of root
      if (userRole === 'hotel_admin' && pathname === '/') {
        return NextResponse.redirect(new URL('/admin/hotel', request.url))
      }

      // Super admin should stay on root, but hotel admin routes are protected
      if (pathname.startsWith('/admin/hotel') && userRole !== 'hotel_admin' && userRole !== 'super_admin') {
        return NextResponse.redirect(new URL('/', request.url))
      }

      // Super admin only routes
      const superAdminRoutes = ['/hotels', '/users']
      if (superAdminRoutes.some(route => pathname.startsWith(route)) && userRole !== 'super_admin') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    } catch (error) {
      // Handle unexpected errors gracefully
      if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('network'))) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Middleware] Error checking user data, allowing request:', error.message)
        }
        // Allow request to proceed - client will handle auth
        return response
      }
      
      // Log unexpected errors but allow request to proceed
      if (process.env.NODE_ENV === 'development') {
        console.error('[Middleware] Unexpected error in user check:', error)
      }
      return response
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

