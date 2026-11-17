import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function PATCH(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params; const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const { data: member } = await supabase.from('workspace_members').select('role').eq('workspace_id',workspaceId).eq('user_id',user.id).maybeSingle();
  if (!member || !['owner','admin'].includes(member.role)) return NextResponse.json({ error: 'Chỉ Owner hoặc Admin mới có thể sửa thông tin workspace.' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const patch: Record<string,string|null> = {};
  if (typeof body.name === 'string') { const value=body.name.trim(); if(value.length<2||value.length>120)return NextResponse.json({error:'Tên workspace phải từ 2 đến 120 ký tự.'},{status:400}); patch.name=value; }
  if (typeof body.company_name === 'string') patch.company_name=body.company_name.trim().slice(0,160)||null;
  if (typeof body.tax_id === 'string') patch.tax_id=body.tax_id.trim().slice(0,40)||null;
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Không có thay đổi hợp lệ.' }, { status: 400 });
  const { data, error } = await supabase.from('workspaces').update(patch).eq('id',workspaceId).select('id,name,company_name,tax_id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ workspace: data });
}
