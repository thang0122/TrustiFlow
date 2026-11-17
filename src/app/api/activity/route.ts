import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
const createSchema = z.object({ workspaceId: z.string().uuid(), title: z.string().min(1).max(200), type: z.string().min(1).max(40), detail: z.string().max(4000).optional() });
export async function GET(request: Request) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const workspaceId = new URL(request.url).searchParams.get('workspaceId');
  if (!workspaceId) return NextResponse.json({ items: [] });
  const { data, error } = await supabase.from('audit_events').select('id,action,entity_type,details,created_at,user_id').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const items = (data || []).map(row => ({ id: row.id, title: String(row.details?.title || row.action), type: String(row.details?.type || row.entity_type), date: row.created_at, status: 'Completed', detail: String(row.details?.detail || ''), transactionRef: row.details?.transactionRef || undefined }));
  return NextResponse.json({ items });
}
export async function POST(request: Request) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Dữ liệu hoạt động không hợp lệ.' }, { status: 400 });
  const { workspaceId, title, type, detail } = parsed.data;
  const { data, error } = await supabase.from('audit_events').insert({ workspace_id: workspaceId, user_id: user.id, entity_type: type, action: 'created', details: { title, type, detail: detail || '' } }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
