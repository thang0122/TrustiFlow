import { inflateRawSync } from 'node:zlib';

function readZipEntries(buffer: Buffer): Map<string, Buffer> {
  const entries = new Map<string, Buffer>();
  let eocd = -1;
  const scanStart = Math.max(0, buffer.length - 65_557);
  for (let i = buffer.length - 22; i >= scanStart; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Tệp Office không có cấu trúc ZIP hợp lệ.');
  const entryCount = buffer.readUInt16LE(eocd + 10);
  if (entryCount > 2048) throw new Error('Tệp Office có quá nhiều thành phần để xử lý an toàn.');
  let uncompressedTotal = 0;
  let cursor = buffer.readUInt32LE(eocd + 16);
  for (let n = 0; n < entryCount; n++) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    if (localOffset + 30 <= buffer.length && buffer.readUInt32LE(localOffset) === 0x04034b50) {
      const localNameLength = buffer.readUInt16LE(localOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
      try {
        const content = method === 0 ? Buffer.from(compressed) : method === 8 ? inflateRawSync(compressed, { maxOutputLength: 12 * 1024 * 1024 }) : null;
        if (content) {
          uncompressedTotal += content.length;
          if (uncompressedTotal > 24 * 1024 * 1024) throw new Error('Tệp Office giải nén vượt giới hạn an toàn 24 MB.');
          entries.set(name, content);
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('vượt giới hạn an toàn')) throw error;
        /* Skip a corrupt optional entry; required entry is checked by caller. */
      }
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function decodeXml(text: string): string {
  return text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}
function stripXml(xml: string): string {
  return decodeXml(xml.replace(/<w:tab\b[^>]*\/>/g, '\t').replace(/<w:br\b[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n').replace(/<\/w:tr>/g, '\n').replace(/<\/w:tc>/g, '\t')
    .replace(/<[^>]+>/g, '')).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function extractOfficeText(fileName: string, bytes: Buffer): string {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'doc') throw new Error('Định dạng .doc cũ chưa được hỗ trợ. Hãy lưu tệp dưới dạng .docx rồi tải lại.');
  if (ext === 'xls') throw new Error('Định dạng .xls cũ chưa được hỗ trợ. Hãy lưu tệp dưới dạng .xlsx rồi tải lại.');
  const entries = readZipEntries(bytes);
  if (ext === 'docx') {
    const document = entries.get('word/document.xml');
    if (!document) throw new Error('Không tìm thấy nội dung Word trong tệp DOCX.');
    const text = stripXml(document.toString('utf8'));
    if (!text) throw new Error('Không trích xuất được văn bản từ tệp DOCX.');
    return text.slice(0, 90_000);
  }
  if (ext === 'xlsx') {
    const sharedXml = entries.get('xl/sharedStrings.xml')?.toString('utf8') || '';
    const shared: string[] = [];
    for (const match of sharedXml.matchAll(/<si[\s\S]*?<\/si>/g)) shared.push(stripXml(match[0]));
    const sheets = [...entries.entries()].filter(([name]) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)).sort(([a],[b]) => a.localeCompare(b));
    if (!sheets.length) throw new Error('Không tìm thấy trang tính trong tệp XLSX.');
    const output: string[] = [];
    for (const [name, xmlBuffer] of sheets) {
      output.push(`\n[${name.replace('xl/worksheets/','').replace('.xml','')}]`);
      const xml = xmlBuffer.toString('utf8');
      for (const row of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
        const cells: Array<{ col: number; value: string }> = [];
        for (const c of row[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
          const ref = c[1].match(/\br="([A-Z]+)\d+"/);
          let col = 0;
          if (ref) for (const ch of ref[1]) col = col * 26 + ch.charCodeAt(0) - 64;
          const type = c[1].match(/\bt="([^"]+)"/)?.[1];
          const value = c[2].match(/<v>([\s\S]*?)<\/v>/)?.[1];
          const inline = c[2].match(/<is>([\s\S]*?)<\/is>/)?.[1];
          let cell = value ? decodeXml(value) : inline ? stripXml(inline) : '';
          if (type === 's' && value !== undefined) cell = shared[Number(value)] ?? value;
          if (cell !== '') cells.push({ col, value: cell });
        }
        const max = Math.max(0, ...cells.map(c => c.col));
        const values = Array.from({ length: max }, (_, i) => cells.find(c => c.col === i + 1)?.value ?? '');
        if (values.some(Boolean)) output.push(values.join('\t'));
      }
    }
    const text = output.join('\n').trim();
    if (!text) throw new Error('Không trích xuất được dữ liệu ô từ tệp XLSX.');
    return text.slice(0, 90_000);
  }
  throw new Error('Tệp Office không thuộc định dạng DOCX hoặc XLSX được hỗ trợ.');
}

export function extractPlainText(fileName: string, mimeType: string, bytes: Buffer): string | null {
  const ext = fileName.toLowerCase().split('.').pop();
  if (['txt','md','csv'].includes(ext || '') || mimeType.startsWith('text/')) {
    return bytes.toString('utf8').replace(/\u0000/g, '').slice(0, 90_000);
  }
  if (['docx','xlsx'].includes(ext || '')) return extractOfficeText(fileName, bytes);
  return null;
}

export function getMimeType(fileName: string, browserMimeType?: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  const map: Record<string,string> = {
    pdf:'application/pdf', docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', csv:'text/csv', txt:'text/plain', md:'text/markdown',
    png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', webp:'image/webp'
  };
  return map[ext || ''] || browserMimeType || 'application/octet-stream';
}
