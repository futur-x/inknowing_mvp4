import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of protected routes that require authentication
const protectedRoutes = [
  '/profile',
  '/profile/edit',      // User profile editing
  '/profile/settings',  // User settings
  '/profile/history',   // User history
  '/dialogues',
  '/upload',
  '/upload/manage',     // Upload management
  '/dashboard',
  '/settings',
  '/chat/book/',        // Book chat sessions require authentication (includes /chat/book/[sessionId])
  '/chat/character/',   // Character chat sessions require authentication (includes /chat/character/[sessionId])
  '/membership',        // Membership center
  '/membership/checkout' // Membership payment
  // Note: /chat index page is public for browsing books
];

// List of auth routes (login, register, etc.)
const authRoutes = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/verify',
  '/login',
  '/register'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );

  // Check if the current route is an auth route
  const isAuthRoute = authRoutes.some(route =>
    pathname.startsWith(route)
  );

  // Get the auth token from cookies (using the cookie name set by backend)
  const token = request.cookies.get('access_token')?.value;

  // If accessing a protected route without a token, redirect to login
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/auth/login', request.url);
    // Add redirect parameter to return to original page after login
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If accessing auth routes with a token, redirect to home or dashboard
  if (isAuthRoute && token) {
    // Check if there's a redirect parameter
    const redirect = request.nextUrl.searchParams.get('redirect');
    const targetUrl = redirect || '/';
    return NextResponse.redirect(new URL(targetUrl, request.url));
  }

  // Allow the request to continue
  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};