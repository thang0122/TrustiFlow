import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
const schema = z.object({ name: z.string().trim().min(2).max(120), company_name: z.string().trim().max(160).optional(), tax_id: z.string().trim().max(40).optional() });
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const { data, error } = await supabase.from('workspace_members').select('workspace_id,role,workspaces(id,name,company_name,tax_id,created_at)').eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ workspaces: data });
}
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Tên workspace phải có từ 2 đến 120 ký tự.' }, { status: 400 });
  const { data, error } = await supabase.from('workspaces').insert({ name: parsed.data.name, company_name: parsed.data.company_name || null, tax_id: parsed.data.tax_id || null, created_by: user.id }).select('id,name,company_name,tax_id,created_at').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ workspace: data }, { status: 201 });
}
