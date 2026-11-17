import { NextResponse } from 'next/server';

export async function GET() {
  const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim());
  const aiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());
  return NextResponse.json({
    status: 'ok', app: 'TrustiFlow',
    supabaseConfigured, authentication: supabaseConfigured ? 'supabase-auth-enabled' : 'not-configured',
    aiConfigured, aiProvider: 'Google Gemini', aiMode: aiConfigured ? 'configured' : 'demo-only',
    capabilities: { accountAndProfiles: supabaseConfigured, workspacesAndRoles: supabaseConfigured, privateDocumentStorage: supabaseConfigured, activityAuditLog: supabaseConfigured, exportWorkflows: 'demo-or-draft', aiDocumentProcessing: 'phase-3' },
    persistence: supabaseConfigured ? 'supabase-account-workspace-documents-and-audit' : 'local-browser-demo'
  });
}
