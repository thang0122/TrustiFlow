import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ configured: false }, { status: 503 });
  }
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { data: profile, error: profileError } = await supabase.from('profiles')
    .select('id,full_name,avatar_url,preferred_language').eq('id', user.id).maybeSingle();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

  let { data: memberships, error: memberError } = await supabase.from('workspace_members')
    .select('workspace_id,role,workspaces(id,name,company_name,tax_id,created_at)').eq('user_id', user.id);
  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 400 });

  if (!memberships?.length) {
    const name = (profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Workspace').trim();
    const { error } = await supabase.from('workspaces').insert({ name: `Workspace ${name}`.slice(0, 120), created_by: user.id });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const result = await supabase.from('workspace_members')
      .select('workspace_id,role,workspaces(id,name,company_name,tax_id,created_at)').eq('user_id', user.id);
    memberships = result.data;
    memberError = result.error;
    if (memberError) return NextResponse.json({ error: memberError.message }, { status: 400 });
  }

  return NextResponse.json({
    configured: true,
    user: { id: user.id, email: user.email, emailConfirmedAt: user.email_confirmed_at, lastSignInAt: user.last_sign_in_at },
    profile: profile || { id: user.id, full_name: user.user_metadata?.full_name || '' },
    workspaces: memberships || [],
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const full_name = typeof body.full_name === 'string' ? body.full_name.trim().slice(0, 100) : undefined;
  const preferred_language = body.preferred_language === 'en' ? 'en' : body.preferred_language === 'vi' ? 'vi' : undefined;
  const patch: Record<string, string> = {};
  if (full_name !== undefined) patch.full_name = full_name;
  if (preferred_language !== undefined) patch.preferred_language = preferred_language;
  let { data, error } = await supabase.from('profiles').update(patch).eq('id', user.id).select().maybeSingle();
  if (!data && !error) {
    const inserted = await supabase.from('profiles').insert({ id: user.id, email: user.email, ...patch }).select().single();
    data = inserted.data; error = inserted.error;
  }
  if (error || !data) return NextResponse.json({ error: error?.message || 'Không tìm thấy hồ sơ người dùng.' }, { status: 400 });
  return NextResponse.json({ profile: data });
}
