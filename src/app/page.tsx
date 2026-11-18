import Link from "next/link";
import { ArrowRight, FileText, ShieldCheck, Users, Database, CheckCircle2 } from "lucide-react";

const capabilities = [
  { icon: FileText, title: "Quản lý chứng từ", description: "Tập trung tài liệu và hồ sơ giao dịch xuất khẩu." },
  { icon: ShieldCheck, title: "Kiểm soát rủi ro", description: "Hỗ trợ rà soát thông tin và sai lệch giữa chứng từ." },
  { icon: Users, title: "Không gian doanh nghiệp", description: "Làm việc theo workspace và vai trò thành viên." },
  { icon: Database, title: "Dữ liệu tập trung", description: "Tổ chức hồ sơ, đối tác, sản phẩm và giao dịch." },
];

export default function Home() {
  return (
    <main className="public-home">
      <header className="public-nav">
        <Link className="public-brand" href="/" aria-label="TrustiFlow trang chủ"><span className="public-brand-mark">T<span>F</span></span><span><strong>TrustiFlow</strong><small>EXPORT OPERATIONS WORKSPACE</small></span></Link>
        <nav className="public-nav-actions"><Link className="public-login-link" href="/login?mode=login">Đăng nhập</Link><Link className="public-signup-link" href="/login?mode=signup">Tạo tài khoản <ArrowRight size={16}/></Link></nav>
      </header>
      <section className="public-hero">
        <div className="public-hero-copy">
          <span className="public-eyebrow"><span/> KHÔNG GIAN NGHIỆP VỤ XUẤT KHẨU</span>
          <h1>Vận hành xuất khẩu <em>tự tin và hiệu quả hơn.</em></h1>
          <p>Một không gian làm việc thống nhất để quản lý tài liệu, chuẩn bị nghiệp vụ thương mại và rà soát tính nhất quán giao dịch.</p>
          <div className="public-hero-actions"><Link className="public-primary-cta" href="/login?mode=signup">Tạo tài khoản miễn phí <ArrowRight size={18}/></Link><Link className="public-secondary-cta" href="/login?mode=login">Tôi đã có tài khoản</Link></div>
          <div className="public-trust-note"><CheckCircle2 size={16}/> Dữ liệu doanh nghiệp được tổ chức theo không gian làm việc riêng.</div>
        </div>
        <div className="public-hero-visual" aria-label="Minh họa không gian làm việc TrustiFlow">
          <div className="public-preview-window"><div className="public-preview-top"><span/><span/><span/><b>TrustiFlow Workspace</b></div><div className="public-preview-body"><aside><i/><i/><i/><i/></aside><div className="public-preview-main"><div className="public-preview-heading"><span>TỔNG QUAN</span><b>Không gian làm việc</b></div><div className="public-preview-stats"><div><small>GIAO DỊCH</small><strong>—</strong></div><div><small>TÀI LIỆU</small><strong>—</strong></div><div><small>RÀ SOÁT</small><strong>—</strong></div></div><div className="public-preview-panel"><b>Hồ sơ giao dịch</b><span/><span/><span/></div><div className="public-preview-panel short"><b>Hoạt động gần đây</b><span/><span/></div></div></div></div><div className="public-float-card"><ShieldCheck size={19}/><span><b>Kiểm soát có hệ thống</b><small>Con người kiểm tra và phê duyệt</small></span></div>
        </div>
      </section>
      <section className="public-capabilities"><div className="public-section-heading"><span className="public-eyebrow">MỘT NỀN TẢNG · NHIỀU NGHIỆP VỤ</span><h2>Mọi thông tin quan trọng, trong cùng một nơi.</h2><p>TrustiFlow hướng tới việc kết nối dữ liệu từ hồ sơ sản phẩm đến chứng từ và rà soát giao dịch.</p></div><div className="public-capability-grid">{capabilities.map(({icon:Icon,title,description})=><article className="public-capability-card" key={title}><span className="public-capability-icon"><Icon size={21}/></span><h3>{title}</h3><p>{description}</p></article>)}</div></section>
      <footer className="public-footer"><span>© 2026 TrustiFlow</span><span>AI hỗ trợ · Con người phê duyệt</span></footer>
    </main>
  );
}
