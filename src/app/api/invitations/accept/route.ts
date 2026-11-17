import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function POST(request: Request) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Bạn cần đăng nhập bằng email được mời.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === 'string' ? body.token : '';
  if (token.length < 32 || token.length > 128) return NextResponse.json({ error: 'Liên kết lời mời không hợp lệ.' }, { status: 400 });
  const { data, error } = await supabase.rpc('accept_workspace_invitation', { invite_token: token });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, workspaceId: data });
}
