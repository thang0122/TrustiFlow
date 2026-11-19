import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request:Request) {
  const supabase = await createClient();
  const {data:{user},error:authError} = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({error:'Bạn cần đăng nhập.'},{status:401});
  const body = await request.json().catch(()=>null);
  const workspaceId = String(body?.workspaceId || '');
  const extractionId = String(body?.extractionId || '');
  if (!workspaceId || !extractionId || !Array.isArray(body?.fields)) return NextResponse.json({error:'Thiếu dữ liệu xác nhận.'},{status:400});
  const {data:extraction,error:findError} = await supabase.from('extractions').select('id,document_id,workspace_id').eq('id',extractionId).eq('workspace_id',workspaceId).maybeSingle();
  if (findError || !extraction) return NextResponse.json({error:'Không tìm thấy kết quả trích xuất hoặc bạn không có quyền.'},{status:404});
  const fields = body.fields.slice(0,300);
  const {error:updateError} = await supabase.from('extractions').update({extracted_data:{...(body.structured || {}),fields},status:'confirmed',reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq('id',extractionId).eq('workspace_id',workspaceId);
  if (updateError) return NextResponse.json({error:updateError.message},{status:400});
  await supabase.from('documents').update({processing_status:'completed'}).eq('id',extraction.document_id).eq('workspace_id',workspaceId);
  await supabase.from('audit_events').insert({workspace_id:workspaceId,user_id:user.id,entity_type:'extraction',entity_id:extractionId,action:'confirmed',details:{title:'Người dùng đã xác nhận dữ liệu trích xuất',type:'document'}});
  return NextResponse.json({ok:true,status:'confirmed'});
}
