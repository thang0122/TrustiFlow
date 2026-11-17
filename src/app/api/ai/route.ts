import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RequestBody = {
  mode?: "document" | "review" | "email" | "general";
  prompt?: string;
  files?: Array<{ name?: string; type?: string }>;
};

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "TrustiFlow",
    aiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    aiProvider: "Google Gemini",
    demoMode: !process.env.GEMINI_API_KEY?.trim(),
    persistence: "local-browser-mode"
  });
}

/**
 * Safe demo response.
 * This endpoint deliberately does not pretend to run AI when no provider key
 * is configured. It keeps the demo UI usable and clearly labels the response.
 * A real Gemini integration can replace this handler when credentials are ready.
 */
export async function POST(request: NextRequest) {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Dữ liệu yêu cầu không hợp lệ." }, { status: 400 });
  }

  const mode = body.mode ?? "general";
  const fileNames = (body.files ?? [])
    .map((file) => file.name)
    .filter((name): name is string => Boolean(name));

  const modeLabels: Record<string, string> = {
    document: "Đọc và phân tích chứng từ",
    review: "Rà soát rủi ro DEALSHIELD",
    email: "Soạn email thương mại",
    general: "Trợ lý nghiệp vụ xuất khẩu"
  };

  const output = [
    "ĐÂY LÀ KẾT QUẢ MÔ PHỎNG – CHƯA PHẢI PHÂN TÍCH AI THỰC TẾ.",
    "",
    `Chức năng: ${modeLabels[mode] ?? modeLabels.general}`,
    fileNames.length
      ? `Tệp đã nhận: ${fileNames.join(", ")}`
      : "Chưa có tệp đính kèm.",
    "",
    "TrustiFlow Demo đã nhận yêu cầu. Để phân tích nội dung chứng từ, đối chiếu dữ liệu hoặc tạo nội dung thương mại thực tế, cần cấu hình khóa Gemini ở môi trường máy chủ.",
    "",
    body.prompt?.trim() ? `Yêu cầu của bạn: ${body.prompt.trim()}` : "Chưa nhập mô tả yêu cầu."
  ].join("\\n");

  return NextResponse.json({
    mode,
    output,
    model: "demo-simulation",
    demo: true
  });
}
