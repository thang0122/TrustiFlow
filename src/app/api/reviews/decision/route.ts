import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request:Request) {
  const supabase = await createClient();
  const {data:{user},error:authError} = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({error:'Bạn cần đăng nhập.'},{status:401});
  const body = await request.json().catch(()=>null);
  const workspaceId = String(body?.workspaceId || '');
  const reviewId = String(body?.reviewId || '');
  const discrepancyId = String(body?.discrepancyId || '');
  const decision = body?.decision;
  if (!workspaceId || !reviewId || !discrepancyId || !['verified','dismissed'].includes(decision)) return NextResponse.json({error:'Quyết định rà soát không hợp lệ.'},{status:400});
  const {data:row,error:findError} = await supabase.from('discrepancies').select('id,review_id,workspace_id').eq('id',discrepancyId).eq('review_id',reviewId).eq('workspace_id',workspaceId).maybeSingle();
  if (findError || !row) return NextResponse.json({error:'Không tìm thấy điểm cần xác minh.'},{status:404});
  const {error:updateError} = await supabase.from('discrepancies').update({verification_status:decision,verified_by:user.id,verified_at:new Date().toISOString()}).eq('id',discrepancyId).eq('workspace_id',workspaceId);
  if (updateError) return NextResponse.json({error:updateError.message},{status:400});
  await supabase.from('audit_events').insert({workspace_id:workspaceId,user_id:user.id,entity_type:'discrepancy',entity_id:discrepancyId,action:decision,details:{title:decision === 'verified' ? 'Người dùng đã xác minh điểm sai lệch' : 'Người dùng đã loại bỏ cảnh báo',type:'review'}});
  return NextResponse.json({ok:true,verification_status:decision});
}
