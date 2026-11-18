import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const createSchema = z.object({
  workspaceId: z.string().uuid(),
  reference_code: z.string().trim().max(100).optional().nullable(),
  buyer_name: z.string().trim().min(1).max(200),
  product_name: z.string().trim().min(1).max(200),
  quantity: z.coerce.number().positive().finite(),
  unit: z.string().trim().min(1).max(40),
  destination: z.string().trim().max(200).optional().nullable(),
  incoterm: z.string().trim().max(10).optional().nullable(),
  delivery: z.string().trim().max(200).optional().nullable(),
  payment_terms: z.string().trim().max(2000).optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
});

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const workspaceId = new URL(request.url).searchParams.get('workspaceId');
  if (!workspaceId) return NextResponse.json({ transactions: [] });
  const { data, error } = await supabase.from('transactions')
    .select('id,workspace_id,reference_code,buyer_name,seller_name,status,currency,incoterm,destination,metadata,created_at,updated_at')
    .eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ transactions: data || [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Thông tin giao dịch chưa hợp lệ.' }, { status: 400 });
  const { workspaceId, reference_code, buyer_name, product_name, quantity, unit, destination, incoterm, delivery, payment_terms, notes } = parsed.data;
  // Reuse an existing workspace counterparty or create a minimal counterparty record
  // from the name explicitly supplied by the user; no legal/tax/banking data is inferred.
  const { data: existingCounterparty, error: counterpartyLookupError } = await supabase.from('counterparties')
    .select('id').eq('workspace_id', workspaceId).ilike('name', buyer_name).limit(1).maybeSingle();
  if (counterpartyLookupError) return NextResponse.json({ error: counterpartyLookupError.message }, { status: 400 });
  let counterpartyId = existingCounterparty?.id || null;
  if (!counterpartyId) {
    const { data: createdCounterparty, error: counterpartyCreateError } = await supabase.from('counterparties')
      .insert({ workspace_id: workspaceId, name: buyer_name, created_by: user.id })
      .select('id').single();
    if (counterpartyCreateError) return NextResponse.json({ error: counterpartyCreateError.message }, { status: 400 });
    counterpartyId = createdCounterparty.id;
  }
  const { data: matchingProduct, error: productLookupError } = await supabase.from('products')
    .select('id').eq('workspace_id', workspaceId).ilike('name', product_name).limit(1).maybeSingle();
  if (productLookupError) return NextResponse.json({ error: productLookupError.message }, { status: 400 });
  const { data, error } = await supabase.from('transactions').insert({
    workspace_id: workspaceId,
    reference_code: reference_code || null,
    counterparty_id: counterpartyId,
    product_id: matchingProduct?.id || null,
    buyer_name,
    status: 'rfq_received',
    incoterm: incoterm || null,
    destination: destination || null,
    metadata: { product_name, quantity, unit, delivery: delivery || null, payment_terms: payment_terms || null, notes: notes || null },
    created_by: user.id,
  }).select('id,workspace_id,reference_code,buyer_name,counterparty_id,product_id,status,incoterm,destination,metadata,created_at').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { error: auditError } = await supabase.from('audit_events').insert({
    workspace_id: workspaceId,
    user_id: user.id,
    entity_type: 'transaction',
    entity_id: data.id,
    action: 'rfq_received',
    details: { title: `Đã tiếp nhận RFQ${reference_code ? ` ${reference_code}` : ''}`, type: 'transaction', detail: `${buyer_name} · ${product_name} · ${quantity} ${unit}` },
  });
  if (auditError) return NextResponse.json({ transaction: data, warning: `Giao dịch đã lưu nhưng chưa ghi được nhật ký: ${auditError.message}` }, { status: 201 });
  return NextResponse.json({ transaction: data }, { status: 201 });
}
