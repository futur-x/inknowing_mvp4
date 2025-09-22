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

  // In development mode, skip authentication checks entirely
  // This allows for easier development with Bearer Token auth
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );

  // Check if the current route is an auth route
  const isAuthRoute = authRoutes.some(route =>
    pathname.startsWith(route)
  );

  // In production, we'll rely on client-side authentication
  // The middleware just passes through and lets client components handle auth
  // This is necessary for Bearer Token authentication to work properly

  // Allow all requests to continue
  // Authentication will be handled by client-side components
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