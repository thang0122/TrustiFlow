import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const allowedTypes = new Set([
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);
const schema = z.object({
  file_name: z.string().min(1).max(255),
  mime_type: z.string().min(1).max(150),
  file_size: z.number().int().positive().max(MAX_FILE_SIZE),
  storage_path: z.string().min(1).max(600),
});

type RouteContext = { params: Promise<{ documentId: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { documentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { data: document, error: documentError } = await supabase.from('documents')
    .select('id,workspace_id,current_version').eq('id', documentId).maybeSingle();
  if (documentError || !document) return NextResponse.json({ error: 'Không tìm thấy tài liệu hoặc bạn không có quyền truy cập.' }, { status: 404 });

  const { data: rows, error } = await supabase.from('document_versions')
    .select('id,version_number,file_name,mime_type,file_size,created_at,storage_path')
    .eq('document_id', documentId).eq('workspace_id', document.workspace_id)
    .order('version_number', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const versions = await Promise.all((rows || []).map(async row => {
    const { data: signed } = await supabase.storage.from('trade-documents').createSignedUrl(row.storage_path, 600);
    return { ...row, signedUrl: signed?.signedUrl || null };
  }));
  return NextResponse.json({ currentVersion: document.current_version || 1, versions });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { documentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Thông tin phiên bản không hợp lệ.' }, { status: 400 });
  const file = parsed.data;
  if (!allowedTypes.has(file.mime_type)) return NextResponse.json({ error: 'Định dạng tệp chưa được hỗ trợ.' }, { status: 415 });

  const { data: document, error: documentError } = await supabase.from('documents')
    .select('id,workspace_id,storage_path,file_name,mime_type,file_size,current_version')
    .eq('id', documentId).maybeSingle();
  if (documentError || !document) return NextResponse.json({ error: 'Không tìm thấy tài liệu hoặc bạn không có quyền truy cập.' }, { status: 404 });

  const { data: member } = await supabase.from('workspace_members').select('role')
    .eq('workspace_id', document.workspace_id).eq('user_id', user.id).maybeSingle();
  if (!member || !['owner', 'admin', 'member'].includes(member.role)) {
    return NextResponse.json({ error: 'Bạn không có quyền tải phiên bản mới.' }, { status: 403 });
  }

  const requiredPrefix = `${document.workspace_id}/${documentId}/`;
  if (!file.storage_path.startsWith(requiredPrefix) || file.storage_path === document.storage_path) {
    return NextResponse.json({ error: 'Đường dẫn lưu trữ phiên bản không hợp lệ.' }, { status: 400 });
  }

  const currentVersion = Number(document.current_version || 1);
  const folder = `${document.workspace_id}/${documentId}`;
  const fileLeaf = file.storage_path.slice(`${folder}/`.length);
  const { data: storedFiles, error: storageListError } = await supabase.storage.from('trade-documents').list(folder, { search: fileLeaf });
  if (storageListError || !storedFiles?.some(item => item.name === fileLeaf)) {
    return NextResponse.json({ error: 'Không tìm thấy tệp phiên bản mới trong kho lưu trữ riêng tư.' }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase.from('documents').update({
    storage_path: file.storage_path,
    file_name: file.file_name,
    mime_type: file.mime_type,
    file_size: file.file_size,
    current_version: currentVersion + 1,
    processing_status: 'uploaded',
  }).eq('id', documentId).eq('current_version', currentVersion)
    .select('id,file_name,mime_type,file_size,current_version,created_at').maybeSingle();
  if (updateError || !updated) {
    return NextResponse.json({ error: updateError?.message || 'Tài liệu vừa được cập nhật ở một phiên khác. Hãy tải lại trang.' }, { status: 409 });
  }

  const { error: archiveError } = await supabase.from('document_versions').insert({
    workspace_id: document.workspace_id,
    document_id: documentId,
    version_number: currentVersion,
    storage_path: document.storage_path,
    file_name: document.file_name,
    mime_type: document.mime_type,
    file_size: document.file_size,
    uploaded_by: user.id,
  });
  if (archiveError) {
    await supabase.from('documents').update({
      storage_path: document.storage_path,
      file_name: document.file_name,
      mime_type: document.mime_type,
      file_size: document.file_size,
      current_version: currentVersion,
    }).eq('id', documentId).eq('current_version', currentVersion + 1);
    return NextResponse.json({ error: archiveError.message }, { status: 400 });
  }
  await supabase.from('audit_events').insert({
    workspace_id: document.workspace_id, user_id: user.id, entity_type: 'document', entity_id: documentId,
    action: 'version_uploaded', details: { title: `Đã tải phiên bản mới: ${updated.file_name}`, type: 'document', detail: `Phiên bản v${updated.current_version}` }
  });
  return NextResponse.json({ document: updated }, { status: 201 });
}
