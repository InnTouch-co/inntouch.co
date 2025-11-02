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

  // Get session to check expiration
  const { data: { session } } = await supabase.auth.getSession()
  
  // Check if session exists and is expired or older than 1 hour
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
    
    // Check if session is older than 1 hour (3600 seconds)
    // Calculate age from session creation (expires_at - default session duration)
    const sessionCreatedAt = sessionExpiry - 3600 // Supabase default session is 1 hour
    const sessionAge = currentTime - sessionCreatedAt
    
    if (sessionAge >= 3600) {
      // Session is 1 hour or older, sign out
      await supabase.auth.signOut()
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('error', 'session_expired')
      return NextResponse.redirect(redirectUrl)
    }
  }
  
  // Refresh session and get user
  const { data: { user: authUser } } = await supabase.auth.getUser()

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

    if (userError || !userData || userData.is_deleted || !userData.active) {
      // User not found or inactive, sign out and redirect to login
      await supabase.auth.signOut()
      const redirectUrl = new URL('/login', request.url)
      if (userError) {
        redirectUrl.searchParams.set('error', `user_not_found: ${userError.message}`)
      } else if (!userData) {
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

