import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const aiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());
  return NextResponse.json({
    status: 'available',
    provider: 'Google Gemini',
    configured: aiConfigured,
    integrationStage: 'phase-3',
  });
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Bạn cần đăng nhập để sử dụng chức năng này.' }, { status: 401 });
  return NextResponse.json({
    error: 'Quy trình AI xử lý tài liệu, RFQ và rà soát sẽ được tích hợp ở Giai đoạn 3. Dữ liệu chưa được gửi tới nhà cung cấp AI.',
    code: 'AI_WORKFLOW_NOT_AVAILABLE',
  }, { status: 501 });
}
