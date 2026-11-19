import { createSign } from 'node:crypto';

let cachedToken: { value: string; expiresAt: number } | null = null;
const b64url = (value: string | Buffer) => Buffer.from(value).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');

function readServiceAccount() {
  const encoded = process.env.DOCUMENT_AI_SERVICE_ACCOUNT_JSON_BASE64?.trim();
  const raw = process.env.DOCUMENT_AI_SERVICE_ACCOUNT_JSON?.trim();
  if (!encoded && !raw) return null;
  try {
    const parsed = JSON.parse(encoded ? Buffer.from(encoded,'base64').toString('utf8') : raw!);
    if (!parsed.client_email || !parsed.private_key) throw new Error('Missing client_email/private_key');
    return parsed as { client_email: string; private_key: string; token_uri?: string };
  } catch {
    throw new Error('Thông tin tài khoản dịch vụ Document AI không hợp lệ. Kiểm tra biến DOCUMENT_AI_SERVICE_ACCOUNT_JSON_BASE64.');
  }
}

export function isDocumentAiConfigured(): boolean {
  return Boolean(process.env.DOCUMENT_AI_PROJECT_ID && process.env.DOCUMENT_AI_LOCATION && process.env.DOCUMENT_AI_PROCESSOR_ID && (process.env.DOCUMENT_AI_SERVICE_ACCOUNT_JSON_BASE64 || process.env.DOCUMENT_AI_SERVICE_ACCOUNT_JSON));
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const account = readServiceAccount();
  if (!account) throw new Error('Chưa cấu hình tài khoản dịch vụ Google Cloud Document AI.');
  const issuedAt = Math.floor(Date.now()/1000);
  const header = b64url(JSON.stringify({ alg:'RS256', typ:'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: account.token_uri || 'https://oauth2.googleapis.com/token',
    iat: issuedAt,
    exp: issuedAt + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256'); signer.update(unsigned); signer.end();
  const assertion = `${unsigned}.${signer.sign(account.private_key).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')}`;
  const response = await fetch(account.token_uri || 'https://oauth2.googleapis.com/token', {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({ grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error(`Google OAuth không cấp được access token (${response.status}). Kiểm tra service account và quyền IAM.`);
  cachedToken = { value:data.access_token, expiresAt:Date.now() + Number(data.expires_in || 3600)*1000 };
  return data.access_token as string;
}

export async function runDocumentAiOcr(bytes: Buffer, mimeType: string): Promise<{ text: string; pages: number; provider: string }> {
  if (!isDocumentAiConfigured()) {
    throw new Error('Chưa cấu hình Google Cloud Document AI OCR. Hãy hoàn tất hướng dẫn trong docs/PHASE-3-SETUP-VI.md rồi thử lại với PDF hoặc ảnh.');
  }
  const project = process.env.DOCUMENT_AI_PROJECT_ID!;
  const location = process.env.DOCUMENT_AI_LOCATION!;
  const processor = process.env.DOCUMENT_AI_PROCESSOR_ID!;
  const token = await getAccessToken();
  const host = location === 'eu' ? 'eu-documentai.googleapis.com' : `${location}-documentai.googleapis.com`;
  const endpoint = `https://${host}/v1/projects/${encodeURIComponent(project)}/locations/${encodeURIComponent(location)}/processors/${encodeURIComponent(processor)}:process`;
  const response = await fetch(endpoint, {
    method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
    body:JSON.stringify({ rawDocument:{ content:bytes.toString('base64'), mimeType } }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message || `Document AI trả về HTTP ${response.status}`;
    throw new Error(`Không xử lý được OCR: ${String(message).slice(0,500)}`);
  }
  const fullText = String(body?.document?.text || '');
  const pageRows = Array.isArray(body?.document?.pages) ? body.document.pages : [];
  const pageText = pageRows.map((page: any, index: number) => {
    const segments = page?.layout?.textAnchor?.textSegments;
    if (!Array.isArray(segments) || !segments.length) return '';
    const content = segments.map((segment: any) => {
      const start = Math.max(0, Number(segment.startIndex || 0));
      const end = Math.max(start, Number(segment.endIndex || start));
      return fullText.slice(start, end);
    }).join('');
    return content.trim() ? `[PAGE ${index + 1}]\n${content.trim()}` : '';
  }).filter(Boolean).join('\n\n');
  const text = (pageText || fullText).trim();
  if (!text) throw new Error('Document AI không nhận diện được văn bản trong tệp.');
  return { text:text.slice(0,90_000), pages:pageRows.length, provider:'Google Cloud Document AI' };
}
