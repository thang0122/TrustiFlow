export type GeminiPart = { text: string };
export type GeminiResult = { text: string; model: string };

export function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
}

export async function generateWithGemini(prompt: string, json = false): Promise<GeminiResult> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error('Chưa cấu hình GEMINI_API_KEY trên môi trường máy chủ.');
  const model = getGeminiModel();
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      contents:[{ role:'user', parts:[{ text:prompt }] }],
      generationConfig:{ temperature:0.1, ...(json ? { responseMimeType:'application/json' } : {}) },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = payload?.error?.message || `Gemini API trả về HTTP ${response.status}`;
    const hint = response.status === 404 ? ' Model có thể không còn khả dụng cho dự án API key này; hãy thử đổi GEMINI_MODEL theo danh sách model được phép trong Google AI Studio.' : '';
    throw new Error(`Gemini API: ${String(msg).slice(0,500)}${hint}`);
  }
  const text = (payload?.candidates?.[0]?.content?.parts || []).map((part: {text?:string}) => part.text || '').join('\n').trim();
  if (!text) throw new Error('Gemini không trả về nội dung. Kiểm tra hạn mức, quyền model và API key.');
  return { text, model };
}

export function parseJsonResult<T = Record<string, unknown>>(text: string): T {
  const clean = text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  try { return JSON.parse(clean) as T; }
  catch {
    const first = clean.indexOf('{'); const last = clean.lastIndexOf('}');
    if (first >= 0 && last > first) return JSON.parse(clean.slice(first,last+1)) as T;
    throw new Error('AI trả về dữ liệu không đúng định dạng JSON. Hãy thử phân tích lại tài liệu.');
  }
}
