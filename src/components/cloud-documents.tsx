'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CloudUpload, Download, FileClock, FileText, History, Loader2, RefreshCw, Trash2, Upload } from 'lucide-react';

type Doc = {
  id: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  current_version: number;
  created_at: string;
  signedUrl: string | null;
};
type DocVersion = {
  id: string;
  version_number: number;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
  signedUrl: string | null;
};

const ALLOWED_TYPES = [
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const MAX_FILE_SIZE = 20 * 1024 * 1024;

function safeFileName(name: string) {
  return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^\.+/, '').slice(-120) || 'document';
}

function fileError(file: File, vi: boolean) {
  if (file.size < 1 || file.size > MAX_FILE_SIZE) return vi ? `${file.name}: dung lượng tối đa 20 MB.` : `${file.name}: maximum file size is 20 MB.`;
  if (!ALLOWED_TYPES.includes(file.type)) return vi ? `${file.name}: định dạng chưa được hỗ trợ.` : `${file.name}: unsupported file format.`;
  return null;
}

function formatSize(bytes: number | null, vi: boolean) {
  if (bytes == null) return '—';
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function CloudDocuments({ workspaceId, language = 'vi' }: { workspaceId: string; language?: 'vi' | 'en' }) {
  const vi = language === 'vi';
  const input = useRef<HTMLInputElement>(null);
  const versionInput = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [versionBusy, setVersionBusy] = useState(false);
  const [versionTarget, setVersionTarget] = useState<Doc | null>(null);
  const [message, setMessage] = useState('');
  const [canDelete, setCanDelete] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [histories, setHistories] = useState<Record<string, DocVersion[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/documents?workspaceId=${encodeURIComponent(workspaceId)}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không tải được danh sách tài liệu.');
      setDocs(data.documents || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tải được danh sách tài liệu.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void load();
    fetch(`/api/workspaces/${workspaceId}/members`, { cache: 'no-store' })
      .then(async response => {
        const data = await response.json();
        if (response.ok) { setCanDelete(['owner', 'admin'].includes(data.role)); setCanWrite(['owner', 'admin', 'member'].includes(data.role)); }
      })
      .catch(() => setCanDelete(false));
  }, [load, workspaceId]);

  async function uploadNew(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setMessage('');
    const supabase = createClient();
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
      for (const file of Array.from(files)) {
        const validationError = fileError(file, vi);
        if (validationError) throw new Error(validationError);
        const documentId = crypto.randomUUID();
        const path = `${workspaceId}/${documentId}/${safeFileName(file.name)}`;
        const { error: uploadError } = await supabase.storage.from('trade-documents').upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw new Error(uploadError.message);
        const { error: insertError } = await supabase.from('documents').insert({
          id: documentId,
          workspace_id: workspaceId,
          uploaded_by: user.id,
          file_name: file.name.slice(0, 255),
          mime_type: file.type,
          file_size: file.size,
          storage_path: path,
          processing_status: 'uploaded',
          current_version: 1,
        });
        if (insertError) {
          await supabase.storage.from('trade-documents').remove([path]);
          throw new Error(insertError.message);
        }
      }
      await load();
      setMessage(vi ? 'Đã tải tài liệu lên kho riêng tư của workspace.' : 'Documents uploaded to the private workspace library.');
    } catch (error) {
      await load();
      setMessage(error instanceof Error ? error.message : 'Tải tệp thất bại.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  async function uploadVersion(file: File | null) {
    const document = versionTarget;
    if (!file || !document) return;
    const validationError = fileError(file, vi);
    if (validationError) { setMessage(validationError); return; }
    setVersionBusy(true);
    setMessage('');
    const supabase = createClient();
    const versionId = crypto.randomUUID();
    const path = `${workspaceId}/${document.id}/${versionId}-${safeFileName(file.name)}`;
    try {
      const { error: uploadError } = await supabase.storage.from('trade-documents').upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error(uploadError.message);
      const response = await fetch(`/api/documents/${document.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_name: file.name.slice(0, 255), mime_type: file.type, file_size: file.size, storage_path: path }),
      });
      const data = await response.json();
      if (!response.ok) {
        await supabase.storage.from('trade-documents').remove([path]);
        throw new Error(data.error || 'Không thể lưu phiên bản mới.');
      }
      setMessage(vi ? `Đã lưu thành phiên bản v${data.document.current_version}.` : `Saved as version ${data.document.current_version}.`);
      setExpanded(current => ({ ...current, [document.id]: true }));
      await Promise.all([load(), loadVersions(document.id)]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tải phiên bản mới.');
    } finally {
      setVersionBusy(false);
      setVersionTarget(null);
      if (versionInput.current) versionInput.current.value = '';
    }
  }

  async function loadVersions(documentId: string) {
    try {
      const response = await fetch(`/api/documents/${documentId}/versions`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không tải được lịch sử phiên bản.');
      setHistories(current => ({ ...current, [documentId]: data.versions || [] }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tải được lịch sử phiên bản.');
    }
  }

  async function toggleHistory(documentId: string) {
    const nextOpen = !expanded[documentId];
    setExpanded(current => ({ ...current, [documentId]: nextOpen }));
    if (nextOpen && histories[documentId] === undefined) await loadVersions(documentId);
  }

  async function removeDocument(document: Doc) {
    if (!window.confirm(vi ? 'Xóa tài liệu này cùng toàn bộ lịch sử phiên bản?' : 'Delete this document and all its versions?')) return;
    try {
      const response = await fetch(`/api/documents?id=${encodeURIComponent(document.id)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể xóa tài liệu.');
      setMessage(vi ? 'Đã xóa tài liệu và các phiên bản lưu trữ.' : 'Document and archived versions deleted.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể xóa tài liệu.');
    }
  }

  return <section className="cloud-doc-panel">
    <div className="cloud-doc-head">
      <div>
        <div className="cloud-doc-eyebrow">SUPABASE STORAGE · PRIVATE</div>
        <h3>{vi ? 'Tài liệu trong workspace' : 'Workspace documents'}</h3>
        <p>{vi ? 'Tệp được lưu trong vùng riêng tư; quyền truy cập được kiểm tra theo thành viên workspace.' : 'Files are private and access is checked against workspace membership.'}</p>
      </div>
      <button className="cloud-refresh" onClick={() => void load()} disabled={loading}><RefreshCw size={15}/>{vi ? 'Làm mới' : 'Refresh'}</button>
    </div>

    <input ref={input} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp" onChange={event => void uploadNew(event.target.files)} hidden/>
    <input ref={versionInput} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp" onChange={event => void uploadVersion(event.target.files?.[0] || null)} hidden/>
    <div className="cloud-upload-zone">
      <div className="cloud-upload-icon"><CloudUpload size={22}/></div>
      <div><strong>{vi ? 'Tải tài liệu lên' : 'Upload documents'}</strong><span>{vi ? 'PDF, Word, Excel hoặc ảnh · tối đa 20 MB mỗi tệp' : 'PDF, Word, Excel or images · up to 20 MB per file'}</span></div>
      <button className="cloud-upload-btn" disabled={busy || versionBusy} onClick={() => input.current?.click()}>{busy ? <Loader2 className="spin" size={16}/> : <CloudUpload size={16}/>} {vi ? 'Chọn tệp' : 'Choose files'}</button>
    </div>

    {message && <p className="cloud-message" role="status">{message}</p>}
    {loading ? <div className="cloud-empty"><Loader2 className="spin" size={18}/>{vi ? 'Đang tải danh sách…' : 'Loading…'}</div> : docs.length === 0 ? <div className="cloud-empty"><FileText size={20}/>{vi ? 'Chưa có tài liệu. Tải tệp đầu tiên lên workspace.' : 'No documents yet. Upload the first file to this workspace.'}</div> : <div className="cloud-doc-list">
      {docs.map(document => <div className="cloud-doc-entry" key={document.id}>
        <div className="cloud-doc-row">
          <div className="cloud-doc-file"><span><FileText size={17}/></span><div><strong title={document.file_name}>{document.file_name}</strong><small>{formatSize(document.file_size, vi)} · v{document.current_version || 1} · {new Date(document.created_at).toLocaleString(vi ? 'vi-VN' : 'en-GB')}</small></div></div>
          <div className="cloud-doc-actions">
            <a href={document.signedUrl || '#'} target="_blank" rel="noreferrer" onClick={event => { if (!document.signedUrl) event.preventDefault(); }} aria-disabled={!document.signedUrl} className={!document.signedUrl ? 'disabled' : ''}><Download size={15}/><span>{vi ? 'Tải xuống' : 'Download'}</span></a>
            <button onClick={() => void toggleHistory(document.id)} aria-label={vi ? 'Xem lịch sử phiên bản' : 'View version history'}><History size={15}/><span>{vi ? 'Lịch sử' : 'History'}</span></button>
            {canWrite && <button disabled={versionBusy} onClick={() => { setVersionTarget(document); versionInput.current?.click(); }} aria-label={vi ? 'Tải phiên bản mới' : 'Upload a new version'}><Upload size={15}/><span>{vi ? 'Bản mới' : 'New version'}</span></button>}
            {canDelete && <button onClick={() => void removeDocument(document)} aria-label={vi ? 'Xóa tài liệu' : 'Delete document'}><Trash2 size={15}/></button>}
          </div>
        </div>
        {expanded[document.id] && <div className="cloud-version-history">
          <div className="cloud-version-title"><FileClock size={15}/>{vi ? `Các phiên bản đã lưu · phiên bản hiện tại v${document.current_version || 1}` : `Archived versions · current version v${document.current_version || 1}`}</div>
          {histories[document.id] === undefined ? <div className="cloud-version-empty"><Loader2 className="spin" size={14}/>{vi ? 'Đang tải lịch sử…' : 'Loading history…'}</div> : histories[document.id].length === 0 ? <div className="cloud-version-empty">{vi ? 'Chưa có phiên bản cũ.' : 'No previous versions.'}</div> : histories[document.id].map(version => <div className="cloud-version-row" key={version.id}><div><strong>v{version.version_number} · {version.file_name}</strong><span>{formatSize(version.file_size, vi)} · {new Date(version.created_at).toLocaleString(vi ? 'vi-VN' : 'en-GB')}</span></div><a href={version.signedUrl || '#'} onClick={event => { if (!version.signedUrl) event.preventDefault(); }} target="_blank" rel="noreferrer" aria-disabled={!version.signedUrl}><Download size={14}/>{vi ? 'Tải bản cũ' : 'Download'}</a></div>)}
        </div>}
      </div>)}
    </div>}
  </section>;
}
