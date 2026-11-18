import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const createSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(1).max(180),
  hs_code: z.string().trim().max(20).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  unit: z.string().trim().max(40).optional().nullable(),
  origin_country: z.string().trim().max(100).optional().nullable(),
});

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const workspaceId = new URL(request.url).searchParams.get('workspaceId');
  if (!workspaceId) return NextResponse.json({ products: [] });
  const { data, error } = await supabase.from('products')
    .select('id,workspace_id,name,hs_code,description,unit,origin_country,sku,created_at,updated_at')
    .eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ products: data || [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Thông tin sản phẩm chưa hợp lệ.' }, { status: 400 });
  const { workspaceId, ...fields } = parsed.data;
  const { data, error } = await supabase.from('products').insert({
    workspace_id: workspaceId,
    ...fields,
    created_by: user.id,
  }).select('id,workspace_id,name,hs_code,description,unit,origin_country,sku,created_at,updated_at').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await supabase.from('audit_events').insert({
    workspace_id: workspaceId, user_id: user.id, entity_type: 'product', entity_id: data.id,
    action: 'created', details: { title: `Đã tạo hồ sơ sản phẩm: ${data.name}`, type: 'product', detail: data.hs_code || 'Hồ sơ sản phẩm' },
  });
  return NextResponse.json({ product: data }, { status: 201 });
}


export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  const parsed = createSchema.omit({ workspaceId: true }).safeParse(body);
  if (!id || !parsed.success) return NextResponse.json({ error: 'Thông tin cập nhật sản phẩm chưa hợp lệ.' }, { status: 400 });
  const { data, error } = await supabase.from('products').update({
    name: parsed.data.name,
    hs_code: parsed.data.hs_code || null,
    description: parsed.data.description || null,
    unit: parsed.data.unit || null,
    origin_country: parsed.data.origin_country || null,
  }).eq('id', id).select('id,workspace_id,name,hs_code,description,unit,origin_country,sku,created_at,updated_at').maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: 'Không tìm thấy hồ sơ hoặc bạn không có quyền cập nhật.' }, { status: 404 });
  await supabase.from('audit_events').insert({
    workspace_id: data.workspace_id, user_id: user.id, entity_type: 'product', entity_id: data.id,
    action: 'updated', details: { title: `Đã cập nhật hồ sơ sản phẩm: ${data.name}`, type: 'product' },
  });
  return NextResponse.json({ product: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Thiếu ID sản phẩm.' }, { status: 400 });
  const { data: product, error: findError } = await supabase.from('products')
    .select('id,workspace_id,name').eq('id', id).maybeSingle();
  if (findError || !product) return NextResponse.json({ error: 'Không tìm thấy sản phẩm hoặc bạn không có quyền.' }, { status: 404 });
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await supabase.from('audit_events').insert({
    workspace_id: product.workspace_id, user_id: user.id, entity_type: 'product', entity_id: product.id,
    action: 'deleted', details: { title: `Đã xóa hồ sơ sản phẩm: ${product.name}`, type: 'product' },
  });
  return NextResponse.json({ ok: true });
}
