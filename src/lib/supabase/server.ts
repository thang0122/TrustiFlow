import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Thiếu cấu hình Supabase phía máy chủ.');
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: unknown }>) {
        try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])); }
        catch { /* Server Components cannot write cookies; middleware refreshes the session. */ }
      },
    },
  });
}
