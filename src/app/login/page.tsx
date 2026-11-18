import { Suspense } from 'react';
import { LoginForm } from '@/components/login-form';

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; mode?: string }> }) {
  return <Suspense fallback={<div className="auth-loading">TrustiFlow</div>}><LoginPageContent searchParams={searchParams} /></Suspense>;
}

async function LoginPageContent({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; mode?: string }> }) {
  const params = await searchParams;
  const candidate = new URL(params.next || '/app', 'https://trustiflow.invalid');
  const next = candidate.origin === 'https://trustiflow.invalid' ? `${candidate.pathname}${candidate.search}${candidate.hash}` : '/app';
  const initialMode = params.mode === 'signup' ? 'signup' : 'login';
  return <LoginForm nextPath={next} callbackError={params.error || ''} initialMode={initialMode} />;
}
