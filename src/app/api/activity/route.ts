import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const createSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  type: z.string().trim().min(1).max(40),
  detail: z.string().max(4000).optional(),
  result: z.unknown(),
  entityId: z.string().uuid().optional().nullable(),
  documentIds: z.array(z.string().uuid()).max(20).optional(),
  relatedObjectId: z.string().uuid().optional().nullable(),
});

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspaceId');
  const activityId = url.searchParams.get('id');
  if (!workspaceId) return NextResponse.json({ error: 'Thiếu workspaceId.' }, { status: 400 });

  if (activityId) {
    const { data, error } = await supabase.from('audit_events')
      .select('id,workspace_id,user_id,entity_type,entity_id,action,details,created_at')
      .eq('id', activityId).eq('workspace_id', workspaceId).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: 'Không tìm thấy kết quả trong workspace này.' }, { status: 404 });
    const details = data.details && typeof data.details === 'object' ? data.details as Record<string, unknown> : {};
    return NextResponse.json({
      item: {
        id: data.id, workspaceId: data.workspace_id, userId: data.user_id,
        entityType: data.entity_type, entityId: data.entity_id, action: data.action,
        title: String(details.title || data.action), type: String(details.type || data.entity_type),
        detail: String(details.detail || ''), result: details.result ?? null,
        resultVersion: details.result_version ?? null, documentIds: details.document_ids ?? [],
        relatedObjectId: details.related_object_id ?? data.entity_id, date: data.created_at,
      },
    });
  }

  const { data, error } = await supabase.from('audit_events')
    .select('id,action,entity_type,details,created_at,user_id')
    .eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const items = (data || []).map(row => {
    const details = row.details && typeof row.details === 'object' ? row.details as Record<string, unknown> : {};
    return {
      id: row.id, title: String(details.title || row.action),
      type: String(details.type || row.entity_type), date: row.created_at,
      status: String(details.status || 'Completed'), detail: String(details.detail || ''),
      transactionRef: details.transactionRef || undefined,
      resultAvailable: details.result !== undefined && details.result !== null,
    };
  });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Dữ liệu kết quả không hợp lệ.', details: parsed.error.flatten() }, { status: 400 });

  const { workspaceId, title, type, detail, result, entityId, documentIds, relatedObjectId } = parsed.data;
  const { data: member, error: memberError } = await supabase.from('workspace_members')
    .select('role').eq('workspace_id', workspaceId).eq('user_id', user.id).maybeSingle();
  if (memberError || !member) return NextResponse.json({ error: 'Bạn không có quyền với workspace này.' }, { status: 403 });

  const { data, error } = await supabase.from('audit_events').insert({
    workspace_id: workspaceId, user_id: user.id, entity_type: type,
    entity_id: entityId || relatedObjectId || null, action: 'result_saved',
    details: {
      title, type, detail: detail || '', status: 'Completed',
      result, result_version: 1, document_ids: documentIds || [],
      related_object_id: relatedObjectId || entityId || null,
    },
  }).select('id').single();
  if (error) return NextResponse.json({ error: `Không lưu được kết quả: ${error.message}` }, { status: 400 });
  return NextResponse.json({ id: data.id, saved: true }, { status: 201 });
}
