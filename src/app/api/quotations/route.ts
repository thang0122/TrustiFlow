import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const createSchema = z.object({
  workspaceId: z.string().uuid(),
  transaction_id: z.string().uuid().optional().nullable(),
  buyer_name: z.string().trim().max(200).optional().nullable(),
  product: z.string().trim().min(1).max(200),
  quantity: z.coerce.number().positive().finite(),
  unit: z.string().trim().max(40).optional().nullable(),
  unit_price: z.coerce.number().min(0).finite(),
  currency: z.string().trim().min(3).max(3),
  freight: z.coerce.number().min(0).finite().nullable().optional(),
  insurance: z.coerce.number().min(0).finite().nullable().optional(),
  other_costs: z.coerce.number().min(0).finite().nullable().optional(),
  margin: z.coerce.number().min(0).finite().nullable().optional(),
  incoterm: z.string().trim().max(10).optional().nullable(),
  destination: z.string().trim().max(200).optional().nullable(),
  payment_terms: z.string().trim().max(2000).optional().nullable(),
});

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const workspaceId = new URL(request.url).searchParams.get('workspaceId');
  if (!workspaceId) return NextResponse.json({ quotations: [] });
  const { data, error } = await supabase.from('quotations')
    .select('id,workspace_id,transaction_id,product_id,buyer_name,product,quantity,unit,unit_price,currency,freight,insurance,other_costs,margin,incoterm,destination,payment_terms,status,created_at,updated_at')
    .eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ quotations: data || [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Thông tin báo giá chưa hợp lệ.' }, { status: 400 });
  const { workspaceId, ...fields } = parsed.data;
  const { data: matchingProduct, error: productLookupError } = await supabase.from('products')
    .select('id').eq('workspace_id', workspaceId).ilike('name', fields.product).limit(1).maybeSingle();
  if (productLookupError) return NextResponse.json({ error: productLookupError.message }, { status: 400 });
  const { data, error } = await supabase.from('quotations').insert({
    workspace_id: workspaceId,
    product_id: matchingProduct?.id || null,
    ...fields,
    created_by: user.id,
    status: 'draft',
  }).select('id,workspace_id,transaction_id,product_id,buyer_name,product,quantity,unit,unit_price,currency,freight,insurance,other_costs,margin,incoterm,destination,payment_terms,status,created_at').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { error: auditError } = await supabase.from('audit_events').insert({
    workspace_id: workspaceId,
    user_id: user.id,
    entity_type: 'quotation',
    entity_id: data.id,
    action: 'created',
    details: { title: `Đã tạo báo giá: ${data.product}`, type: 'quotation', detail: `${data.quantity} ${data.unit || ''} × ${data.unit_price} ${data.currency}`.trim() },
  });
  if (auditError) return NextResponse.json({ quotation: data, warning: `Báo giá đã lưu nhưng chưa ghi được nhật ký: ${auditError.message}` }, { status: 201 });
  return NextResponse.json({ quotation: data }, { status: 201 });
}
