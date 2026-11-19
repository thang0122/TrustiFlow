import { NextResponse } from 'next/server';

export async function GET() {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  );
  const aiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());
  return NextResponse.json({
    status: 'ok',
    app: 'TrustiFlow',
    supabaseConfigured,
    authentication: supabaseConfigured ? 'supabase-auth-enabled' : 'not-configured',
    aiConfigured,
    aiProvider: 'Google Gemini Developer API',
    aiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    ocrConfigured: Boolean(process.env.DOCUMENT_AI_PROJECT_ID && process.env.DOCUMENT_AI_LOCATION && process.env.DOCUMENT_AI_PROCESSOR_ID && (process.env.DOCUMENT_AI_SERVICE_ACCOUNT_JSON_BASE64 || process.env.DOCUMENT_AI_SERVICE_ACCOUNT_JSON)),
    ocrProvider: 'Google Cloud Document AI',
    integrationStages: {
      accountsWorkspacesDocuments: 'phase-2',
      aiDocumentProcessing: 'phase-3',
      productionHardening: 'phase-4',
      commercialOperations: 'phase-5',
    },
  });
}
