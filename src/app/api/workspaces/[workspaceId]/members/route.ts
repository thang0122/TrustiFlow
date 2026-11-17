import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';

const roleSchema = z.enum(['admin','member','reviewer']);
const inviteSchema = z.object({ email: z.string().email().max(254), role: roleSchema });

export async function GET(_request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params; const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const { data: own, error: ownError } = await supabase.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', user.id).maybeSingle();
  if (ownError || !own) return NextResponse.json({ error: 'Bạn không có quyền truy cập workspace này.' }, { status: 403 });
  const { data: members, error } = await supabase.from('workspace_members').select('workspace_id,user_id,role,created_at').eq('workspace_id', workspaceId).order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const userIds = (members || []).map(m => m.user_id);
  const { data: profiles } = userIds.length ? await supabase.from('profiles').select('id,full_name,email,avatar_url').in('id', userIds) : { data: [] };
  const byId = new Map((profiles || []).map(p => [p.id,p]));
  return NextResponse.json({ role: own.role, members: (members || []).map(m => ({ ...m, profile: byId.get(m.user_id) || null, isCurrentUser: m.user_id === user.id })) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params; const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const { data: own } = await supabase.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', user.id).maybeSingle();
  if (!own || !['owner','admin'].includes(own.role)) return NextResponse.json({ error: 'Chỉ Owner hoặc Admin mới được mời thành viên.' }, { status: 403 });
  const parsed = inviteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Email hoặc vai trò không hợp lệ.' }, { status: 400 });
  if (own.role === 'admin' && parsed.data.role === 'admin') return NextResponse.json({ error: 'Chỉ Owner mới có thể mời người dùng với vai trò Admin.' }, { status: 403 });
  const email = parsed.data.email.trim().toLowerCase();
  const token = randomBytes(32).toString('base64url');
  const { error } = await supabase.from('workspace_invitations').insert({ workspace_id: workspaceId, email, role: parsed.data.role, token, created_by: user.id, expires_at: new Date(Date.now() + 7 * 86400000).toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ invitation: { email, role: parsed.data.role, url: `${request.nextUrl.origin}/invite/${token}`, expiresInDays: 7 } }, { status: 201 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params; const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const targetId = typeof body.userId === 'string' ? body.userId : '';
  const parsedRole = roleSchema.safeParse(body.role);
  if (!targetId || !parsedRole.success) return NextResponse.json({ error: 'Thành viên hoặc vai trò không hợp lệ.' }, { status: 400 });
  const { data: own } = await supabase.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', user.id).maybeSingle();
  if (!own || !['owner','admin'].includes(own.role)) return NextResponse.json({ error: 'Bạn không có quyền thay đổi vai trò.' }, { status: 403 });
  const { data: target } = await supabase.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', targetId).maybeSingle();
  if (!target) return NextResponse.json({ error: 'Không tìm thấy thành viên.' }, { status: 404 });
  if (target.role === 'owner') return NextResponse.json({ error: 'Không thể thay đổi vai trò Owner.' }, { status: 400 });
  if (own.role === 'admin' && (target.role === 'admin' || parsedRole.data === 'admin')) return NextResponse.json({ error: 'Admin không thể thay đổi vai trò Admin khác hoặc cấp quyền Admin.' }, { status: 403 });
  const { error } = await supabase.from('workspace_members').update({ role: parsedRole.data }).eq('workspace_id', workspaceId).eq('user_id', targetId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params; const targetId = request.nextUrl.searchParams.get('userId') || '';
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const { data: own } = await supabase.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', user.id).maybeSingle();
  if (!own || !['owner','admin'].includes(own.role)) return NextResponse.json({ error: 'Bạn không có quyền xóa thành viên.' }, { status: 403 });
  const { data: target } = await supabase.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', targetId).maybeSingle();
  if (!target) return NextResponse.json({ error: 'Không tìm thấy thành viên.' }, { status: 404 });
  if (target.role === 'owner' || targetId === user.id) return NextResponse.json({ error: 'Không thể xóa Owner hoặc tự xóa chính mình tại đây.' }, { status: 400 });
  if (own.role === 'admin' && target.role === 'admin') return NextResponse.json({ error: 'Admin không thể xóa Admin khác.' }, { status: 403 });
  const { error } = await supabase.from('workspace_members').delete().eq('workspace_id', workspaceId).eq('user_id', targetId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
