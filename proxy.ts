import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Session refresh and an optimistic route guard.
 *
 * Next.js 16 renamed Middleware to Proxy; the behaviour is unchanged.
 *
 * Two jobs, in this order:
 *   1. Refresh the Supabase session cookie, so a signed-in user is not logged
 *      out mid-visit when the access token expires.
 *   2. Redirect signed-out visitors away from authenticated routes.
 *
 * Step 2 is a convenience, not the security boundary. Real authorisation is
 * re-checked in every page and Server Action (lib/auth.ts) and ultimately
 * enforced by Row Level Security in Postgres.
 */

const PROTECTED = ['/dashboard', '/rides', '/settings', '/admin']
const AUTH_PAGES = ['/login', '/signup']

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  if (!user && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (user && AUTH_PAGES.includes(path)) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
