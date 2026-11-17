'use client';
import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LockKeyhole, ShieldCheck } from 'lucide-react';

export default function UpdatePasswordPage() {
  const [password,setPassword]=useState(''); const [confirm,setConfirm]=useState(''); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false); const router=useRouter();
  async function submit(e:FormEvent){e.preventDefault(); if(password!==confirm){setMessage('Mật khẩu xác nhận không khớp.');return;} setBusy(true);setMessage('');try{const {error}=await createClient().auth.updateUser({password});if(error)throw error;setMessage('Đã cập nhật mật khẩu. Đang chuyển về ứng dụng…');setTimeout(()=>router.replace('/'),900);}catch(err){setMessage(err instanceof Error?err.message:'Không thể cập nhật mật khẩu.');}finally{setBusy(false);}}
  return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><div className="auth-brand-mark">T<span>F</span></div><div><strong>TrustiFlow</strong><small>ACCOUNT SECURITY</small></div></div><div className="auth-intro"><h1>Đặt mật khẩu mới</h1><p>Chọn mật khẩu mới để bảo vệ tài khoản của bạn.</p></div><form className="auth-form" onSubmit={submit}><label>Mật khẩu mới<div className="auth-input-wrap"><LockKeyhole size={17}/><input type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password"/></div></label><label>Nhập lại mật khẩu<div className="auth-input-wrap"><LockKeyhole size={17}/><input type="password" minLength={8} required value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password"/></div></label><button className="auth-submit" disabled={busy}>{busy?'Đang lưu…':'Cập nhật mật khẩu'}</button></form>{message&&<div className="auth-message" role="status">{message}</div>}<div className="auth-security"><ShieldCheck size={15}/> Liên kết khôi phục chỉ dùng được trong thời hạn do Supabase quy định.</div></section></main>;
}
