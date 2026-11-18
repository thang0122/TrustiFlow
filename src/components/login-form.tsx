"use client";

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react';

export function LoginForm({ nextPath = '/app', callbackError = '', initialMode = 'login' }: { nextPath?: string; callbackError?: string; initialMode?: 'login' | 'signup' }) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(callbackError ? 'Liên kết xác thực không còn hợp lệ hoặc đã hết hạn. Hãy yêu cầu gửi lại email.' : '');
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(''); setSuccess(false);
    try {
      const supabase = createClient();
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password` });
        if (error) throw error;
        setSuccess(true); setMessage('Đã gửi hướng dẫn khôi phục mật khẩu. Hãy kiểm tra hộp thư của bạn.');
        return;
      }
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name.trim() }, emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}` } });
        if (error) throw error;
        if (!data.session) {
          setSuccess(true); setMessage('Tài khoản đã được tạo. Vui lòng mở email xác nhận trước khi đăng nhập.');
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      window.location.assign(nextPath);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể thực hiện yêu cầu. Vui lòng thử lại.');
    } finally { setBusy(false); }
  }

  const title = mode === 'login' ? 'Chào mừng trở lại' : mode === 'signup' ? 'Tạo tài khoản TrustiFlow' : 'Khôi phục mật khẩu';
  const subtitle = mode === 'login' ? 'Đăng nhập để tiếp tục công việc của bạn.' : mode === 'signup' ? 'Tạo tài khoản để thiết lập không gian làm việc riêng.' : 'Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.';
  return <main className="auth-page">
    <div className="auth-backdrop" aria-hidden="true" />
    <section className="auth-card">
      <div className="auth-brand"><div className="auth-brand-mark">T<span>F</span></div><div><strong>TrustiFlow</strong><small>EXPORT OPERATIONS WORKSPACE</small></div></div>
      <div className="auth-intro"><span className="auth-eyebrow"><Sparkles size={13}/> WORKSPACE ACCESS</span><h1>{title}</h1><p>{subtitle}</p></div>
      <form className="auth-form" onSubmit={submit}>
        {mode === 'signup' && <label>Họ và tên<div className="auth-input-wrap"><input required autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Tên hiển thị"/></div></label>}
        <label>Email<div className="auth-input-wrap"><Mail size={17}/><input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@company.com"/></div></label>
        {mode !== 'forgot' && <label>Mật khẩu<div className="auth-input-wrap"><LockKeyhole size={17}/><input required minLength={8} type={showPassword?'text':'password'} autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Tối thiểu 8 ký tự"/><button type="button" className="auth-eye" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Ẩn mật khẩu':'Hiện mật khẩu'}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>}
        {mode === 'login' && <button type="button" className="auth-link auth-forgot" onClick={()=>{setMode('forgot');setMessage('');}}>Quên mật khẩu?</button>}
        <button className="auth-submit" disabled={busy}>{busy?'Đang xử lý…':mode==='login'?'Đăng nhập':mode==='signup'?'Tạo tài khoản':'Gửi liên kết khôi phục'}<ArrowRight size={17}/></button>
      </form>
      {message && <div className={`auth-message ${success?'success':''}`} role="status">{message}</div>}
      <div className="auth-switch">
        {mode==='login' ? <>Chưa có tài khoản? <button onClick={()=>{setMode('signup');setMessage('');}}>Đăng ký</button></> : mode==='signup' ? <>Đã có tài khoản? <button onClick={()=>{setMode('login');setMessage('');}}>Đăng nhập</button></> : <>Đã nhớ mật khẩu? <button onClick={()=>{setMode('login');setMessage('');}}>Quay lại đăng nhập</button></>}
      </div>
      <div className="auth-security"><ShieldCheck size={15}/> Xác thực tài khoản và phiên đăng nhập qua Supabase Auth</div>
      <p className="auth-footnote">Tài khoản của bạn chỉ truy cập dữ liệu thuộc workspace được cấp quyền.</p>
    </section>
  </main>;
}
