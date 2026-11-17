import { Suspense } from 'react';
import { LoginForm } from '@/components/login-form';

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  return <Suspense fallback={<div className="auth-loading">TrustiFlow</div>}><LoginPageContent searchParams={searchParams} /></Suspense>;
}

async function LoginPageContent({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const candidate = new URL(params.next || '/', 'https://trustiflow.invalid');
  const next = candidate.origin === 'https://trustiflow.invalid' ? `${candidate.pathname}${candidate.search}${candidate.hash}` : '/';
  return <LoginForm nextPath={next} callbackError={params.error || ''} />;
}
