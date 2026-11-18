# TrustiFlow — Giai đoạn 2: Backend và dữ liệu

Mã nguồn Next.js của TrustiFlow được đặt trực tiếp ở cấp gốc của gói, không lồng trong thư mục dự án khác.

## Thành phần đã triển khai trong mã nguồn

- Supabase SSR client cho trình duyệt và máy chủ; `proxy.ts` làm mới phiên và bảo vệ các route cần đăng nhập.
- Supabase Auth: đăng ký, đăng nhập, đăng xuất, xác nhận email, quên mật khẩu và cập nhật mật khẩu.
- API hồ sơ người dùng; tự tạo workspace đầu tiên; tạo và chuyển workspace.
- Phân quyền Owner, Admin, Member, Reviewer; quản lý thành viên; lời mời bằng liên kết có thời hạn; kiểm soát quyền ở API và Row Level Security (RLS).
- Supabase Storage riêng tư: kiểm tra MIME/dung lượng, tải lên, tải xuống bằng signed URL, lưu phiên bản và xóa tài liệu.
- PostgreSQL cho hồ sơ người dùng, workspace, thành viên, đối tác, sản phẩm, giao dịch, tài liệu, phiên bản, extraction, báo giá, rà soát, sai lệch, audit, lời mời và thông báo.
- CRUD hồ sơ sản phẩm, tiếp nhận RFQ thành giao dịch và lưu báo giá vào workspace.
- Nhật ký hoạt động và danh sách thông báo theo người dùng/workspace.
- Giao diện tài khoản, menu hồ sơ/cài đặt/đăng xuất, thông báo và trạng thái kết nối.

## Cấu hình môi trường

Tạo `.env.local` tại thư mục có `package.json` khi chạy local. Dùng `.env.example` làm mẫu.

```env
NEXT_PUBLIC_SUPABASE_URL=https://estabmwikpblktxeddvc.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

Không đưa `.env.local`, Database password hoặc Supabase Secret key lên GitHub. Chỉ Publishable key được phép sử dụng ở phía trình duyệt; dữ liệu phải luôn được bảo vệ bằng RLS.

## Cài đặt và kiểm tra mã nguồn

```bash
npm ci
npm run build
npm run dev
```

## Thiết lập PostgreSQL/Supabase

Với project Supabase hiện tại, mở SQL Editor và chạy **một lần** toàn bộ file `supabase/SETUP-PHASE2-PRODUCTION.sql`. Đây là script bootstrap/phục hồi độc lập, có thể chạy trên database chưa có bảng `profiles` hoặc trên database đã có một phần các bảng Phase 2. Script chỉ thay thế các policy mang tên TrustiFlow, không xóa policy không liên quan của project.

Sau khi chạy thành công, kiểm tra các bảng trong Table Editor, bucket `trade-documents` ở chế độ Private và tải lại schema cache. Chi tiết tại `docs/PHASE-2-SETUP-VI.md`.

## Triển khai Vercel

- Root Directory: `./`
- Install Command: `npm ci`
- Build Command: `npm run build`
- Environment Variables: `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` cho Production.
- Sau khi thay biến môi trường hoặc cập nhật mã nguồn, tạo deployment mới.

Cấu hình Site URL và Redirect URLs trong Supabase Authentication theo domain production thực tế, ví dụ `https://trusti-flow.vercel.app/auth/callback`.

## Ranh giới các giai đoạn

Giai đoạn 2 tập trung vào tài khoản, workspace, phân quyền, cơ sở dữ liệu, lưu trữ tài liệu, CRUD dữ liệu nền tảng và nhật ký hoạt động. Phân tích tài liệu bằng AI/OCR, trích xuất RFQ tự động, luồng DEALSHIELD tự động và tự động hóa email thuộc Giai đoạn 3. Kiểm thử bảo mật, độ tin cậy, backup và phục hồi thuộc Giai đoạn 4; thương mại hóa thuộc Giai đoạn 5.

## Tình trạng nghiệm thu

Gói mã nguồn không thể tự chạy SQL trên project Supabase hoặc tự triển khai lên Vercel. Chỉ xác nhận Giai đoạn 2 hoàn thành trên Production sau khi script SQL đã chạy thành công, deployment build `Ready`, Auth/Workspace/RLS/Storage được kiểm tra bằng các tài khoản riêng biệt và các thao tác ghi/đọc dữ liệu hoạt động thực tế.
