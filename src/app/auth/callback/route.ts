import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const requested = request.nextUrl.searchParams.get('next') ?? '/';
  const candidate = new URL(requested, request.nextUrl.origin);
  const next = candidate.origin === request.nextUrl.origin ? `${candidate.pathname}${candidate.search}${candidate.hash}` : '/';
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.redirect(new URL('/login?error=auth_callback', request.url));
}
