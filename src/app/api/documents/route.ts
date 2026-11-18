import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const workspaceId = new URL(request.url).searchParams.get('workspaceId');
  if (!workspaceId) return NextResponse.json({ documents: [] });
  const { data, error } = await supabase.from('documents').select('id,workspace_id,file_name,mime_type,file_size,document_type,processing_status,created_at,storage_path,current_version').eq('workspace_id', workspaceId).order('created_at',{ascending:false}).limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const documents = await Promise.all((data || []).map(async row => {
    const { data: signed } = await supabase.storage.from('trade-documents').createSignedUrl(row.storage_path, 600);
    return { ...row, signedUrl: signed?.signedUrl || null };
  }));
  return NextResponse.json({ documents });
}

export async function DELETE(request: Request) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Thiếu ID tài liệu.' }, { status: 400 });
  const { data: document, error: findError } = await supabase.from('documents').select('id,storage_path,workspace_id,file_name').eq('id',id).maybeSingle();
  if (findError || !document) return NextResponse.json({ error: 'Không tìm thấy tài liệu hoặc bạn không có quyền.' }, { status: 404 });
  const { data: versions, error: versionError } = await supabase.from('document_versions')
    .select('storage_path').eq('document_id', id).eq('workspace_id', document.workspace_id);
  if (versionError) return NextResponse.json({ error: versionError.message }, { status: 400 });
  const paths = [document.storage_path, ...(versions || []).map(version => version.storage_path)];
  const { error: storageError } = await supabase.storage.from('trade-documents').remove(paths);
  if (storageError) return NextResponse.json({ error: storageError.message }, { status: 400 });
  const { error } = await supabase.from('documents').delete().eq('id',id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await supabase.from('audit_events').insert({
    workspace_id: document.workspace_id, user_id: user.id, entity_type: 'document', entity_id: document.id,
    action: 'deleted', details: { title: `Đã xóa tài liệu: ${document.file_name}`, type: 'document', detail: 'Tài liệu và các phiên bản đã xóa khỏi kho lưu trữ.' }
  });
  return NextResponse.json({ ok: true });
}
