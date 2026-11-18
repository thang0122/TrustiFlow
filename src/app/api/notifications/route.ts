import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const updateSchema = z.object({
  id: z.string().uuid().optional(),
  workspaceId: z.string().uuid().optional(),
  markAllRead: z.boolean().optional(),
});

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const workspaceId = new URL(request.url).searchParams.get('workspaceId');
  if (!workspaceId) return NextResponse.json({ notifications: [] });
  const { data, error } = await supabase.from('notifications')
    .select('id,workspace_id,title,body,category,href,read_at,created_at')
    .eq('workspace_id', workspaceId).eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(30);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ notifications: data || [] });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (!parsed.data.id && !(parsed.data.markAllRead && parsed.data.workspaceId))) {
    return NextResponse.json({ error: 'Yêu cầu cập nhật thông báo không hợp lệ.' }, { status: 400 });
  }
  let query = supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id);
  if (parsed.data.id) query = query.eq('id', parsed.data.id);
  if (parsed.data.workspaceId) query = query.eq('workspace_id', parsed.data.workspaceId);
  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
