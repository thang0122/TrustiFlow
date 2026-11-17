# TrustiFlow Phase 2 — triển khai mới, không ghi đè repository cũ

## Mục tiêu
Gói này có mã nguồn ở ngay thư mục gốc ZIP (không lồng trong `ftu2-main/`). Hãy tạo một GitHub repository mới và một Vercel project mới để không ghi đè hoặc làm gián đoạn website hiện tại.

## A. Tạo repository GitHub mới
1. GitHub → New repository.
2. Đặt tên `trustiflow-phase2` (hoặc tên khác), chọn Private nếu muốn.
3. Không chọn tạo README, .gitignore hay license tự động.
4. Giải nén ZIP này trên máy tính.
5. Mở thư mục vừa giải nén. Chọn toàn bộ nội dung bên trong (phải nhìn thấy `package.json`, `src`, `supabase`, `proxy.ts`) và tải lên repository mới. Không tải nguyên file ZIP và không tải thư mục cha chứa các file này. Dùng GitHub Desktop (clone repository, copy toàn bộ nội dung đã giải nén vào thư mục clone, commit và Push) để giữ nguyên các thư mục con; không chỉ upload từng file rời.
6. Sau khi tải xong, trang Code của repository phải hiển thị `package.json`, `package-lock.json`, `src/`, `supabase/`, `proxy.ts` ở cấp đầu tiên.

## B. Tạo Vercel project mới
1. Vercel → Add New → Project.
2. Import repository `trustiflow-phase2` vừa tạo.
3. Framework preset: Next.js. Root Directory: `./`.
4. Build Command: `npm run build`; Install Command: `npm ci`.
5. Chưa gắn domain `ftu2-pi.vercel.app`; giữ website cũ hoạt động cho đến khi bản mới được kiểm thử.
6. Thêm Environment Variables cho Production (và Preview nếu dùng):
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL Supabase của bạn.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = Publishable key Supabase của bạn.
   Không thêm Database password hoặc Supabase Secret key vào ZIP/GitHub/trình duyệt.
7. Deploy. Chỉ khi deployment Ready mới chuyển sang kiểm tra Auth và database.

## C. Supabase
1. Trong Supabase → Authentication → URL Configuration, Site URL sau khi deploy: `https://trusti-floww-xxb5.vercel.app`.
2. Thêm Redirect URL: `https://trusti-floww-xxb5.vercel.app/auth/callback` và `http://localhost:3000/auth/callback`.
3. SQL Editor: nếu đây là database mới và chưa chạy migration nào, chạy lần lượt bốn file trong `supabase/migrations/` theo thứ tự tên:
   - `202611180001_initial_saas.sql`
   - `202611180002_phase2_completion.sql`
   - `202611180003_document_versions.sql`
   - `202611180004_membership_security_hardening.sql`
4. Nếu đã chạy một hoặc nhiều migration trước đó trên project Supabase hiện tại, KHÔNG chạy lặp lại mù quáng. Đối chiếu lịch sử migration và trạng thái bảng trước khi chạy phần còn thiếu.
5. Cấu hình SMTP riêng trước khi dùng email xác thực cho người dùng thật; email mặc định có giới hạn.

## D. Kiểm tra trước khi chuyển domain
- Deployment Vercel mới có trạng thái Ready.
- `/login` hiển thị form đăng nhập/đăng ký.
- Đăng ký, email callback, đăng nhập, đăng xuất và khôi phục mật khẩu hoạt động.
- Workspace được tạo và chỉ người có membership mới truy cập được.
- Kiểm tra RLS bằng hai tài khoản thuộc hai workspace khác nhau.
- Upload/tải tài liệu trong Storage private thành công; tài khoản ngoài workspace không truy cập được.
- Chỉ sau khi tất cả kiểm tra trên đạt mới gắn domain production hiện tại vào Vercel project mới.

## Phạm vi và giới hạn
- Phase 2 gồm nền tảng Supabase Auth, workspace/membership, RLS, lời mời bằng link, audit log và kho tài liệu riêng tư có phiên bản.
- Lời mời thành viên hiện tạo link để quản trị viên gửi thủ công; chưa tự gửi email.
- AI/OCR/RFQ/quotation/DEALSHIELD tự động vẫn là phạm vi Phase 3; không coi các luồng demo là AI production.
- Không đưa tài liệu doanh nghiệp nhạy cảm lên trước khi kiểm thử RLS và quyền Storage.
