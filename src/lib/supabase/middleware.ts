import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const isPublic = request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/auth/callback') || request.nextUrl.pathname.startsWith('/auth/update-password') || request.nextUrl.pathname.startsWith('/api/health') || request.nextUrl.pathname.startsWith('/_next') || request.nextUrl.pathname === '/manifest.webmanifest' || request.nextUrl.pathname === '/sw.js' || request.nextUrl.pathname.startsWith('/icons');
  if (!url || !key) {
    if (isPublic) return response;
    const target = request.nextUrl.clone();
    target.pathname = '/login';
    target.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(target);
  }
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: unknown }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !isPublic) {
    const target = request.nextUrl.clone();
    target.pathname = '/login';
    target.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(target);
  }
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/')) {
    const target = request.nextUrl.clone();
    target.pathname = '/app';
    target.search = '';
    return NextResponse.redirect(target);
  }
  return response;
}
