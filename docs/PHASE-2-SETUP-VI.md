# TrustiFlow — cấu hình và triển khai Giai đoạn 2

Tài liệu này hướng dẫn thiết lập Supabase, xác thực, workspace, phân quyền, lưu trữ tài liệu, dữ liệu nghiệp vụ và thông báo.

## 1. Biến môi trường Vercel

Mở Vercel → Project → Settings → Environment Variables. Thêm cho Production:

```env
NEXT_PUBLIC_SUPABASE_URL=https://estabmwikpblktxeddvc.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_lBHa_tVEoUV4Hwg3ISWdSw_pVcSxnEx
```

Đây là URL project và Publishable key đã được cung cấp cho TrustiFlow. Không đưa Database password hoặc Supabase Secret key vào GitHub, ZIP hay trình duyệt. Sau khi lưu biến, phải tạo deployment mới để Next.js nhận cấu hình.

## 2. Khởi tạo/phục hồi PostgreSQL và RLS

Vào Supabase Dashboard → SQL Editor → New query. Mở file trong gói:

`supabase/SETUP-PHASE2-PRODUCTION.sql`

Sao chép toàn bộ nội dung và chạy một lần trong SQL Editor. Script có tính idempotent: tạo bảng/column còn thiếu, tạo lại policy và trigger do TrustiFlow quản lý, tạo bucket private, cấp quyền cho role `authenticated`, bổ sung hồ sơ cho các tài khoản Auth đã tồn tại và yêu cầu PostgREST tải lại schema cache.

**Không chạy riêng file này đồng thời với các migration 001–005 một cách tùy tiện.** Đây là đường thiết lập thống nhất cho project hiện tại, đặc biệt khi ứng dụng từng báo `Could not find the table 'public.profiles' in the schema cache`.

Sau khi SQL chạy thành công, vào Table Editor kiểm tra các bảng:

- `profiles`
- `workspaces`
- `workspace_members`
- `counterparties`
- `products`
- `transactions`
- `documents`
- `document_versions`
- `extractions`
- `quotations`
- `document_reviews`
- `discrepancies`
- `audit_events`
- `workspace_invitations`
- `notifications`

Trong Storage, xác nhận bucket `trade-documents` tồn tại và đang ở chế độ **Private**, giới hạn 20 MB mỗi tệp.

## 3. Cấu hình Supabase Auth

Supabase Dashboard → Authentication → URL Configuration:

- Site URL: `https://trusti-flow.vercel.app`
- Redirect URL: `https://trusti-flow.vercel.app/auth/callback`
- Redirect URL local: `http://localhost:3000/auth/callback` (chỉ dùng khi chạy local)

Nếu domain production thay đổi, cập nhật URL theo domain đang sử dụng. Đối với gửi email ổn định cho người dùng, cấu hình SMTP riêng trong Supabase Auth.

## 4. Các chức năng trong Giai đoạn 2

1. Đăng ký, xác nhận email, đăng nhập, đăng xuất, quên mật khẩu và cập nhật mật khẩu.
2. Khôi phục phiên thông qua Supabase SSR cookie và `proxy.ts`.
3. Tạo workspace cá nhân khi tài khoản Auth chưa có workspace; tạo và chuyển workspace.
4. Quản lý vai trò Owner/Admin/Member/Reviewer. Owner/Admin có thể quản lý thành viên theo giới hạn quyền.
5. Mời thành viên bằng liên kết có hạn 7 ngày. Quản trị viên gửi liên kết cho đúng email; người nhận phải đăng nhập bằng email đó để chấp nhận. Liên kết chưa tự gửi email.
6. Lưu hồ sơ sản phẩm, giao dịch RFQ và báo giá vào PostgreSQL theo workspace.
7. Nhật ký `audit_events` tạo thông báo cá nhân cho thành viên workspace; người dùng có thể xem danh sách, đánh dấu đã đọc và đánh dấu tất cả đã đọc.
8. Tài liệu được lưu trong bucket riêng tư; hỗ trợ PDF, Word, Excel, PNG, JPG và WEBP, tối đa 20 MB/tệp; có signed URL, phiên bản và xóa tài liệu.
9. Các bảng dữ liệu dùng RLS để giới hạn bản ghi theo membership; dữ liệu workspace A không được truy cập từ workspace B.

## 5. Triển khai mã nguồn

1. Giải nén ZIP và đưa toàn bộ nội dung ở cấp gốc (nơi có `package.json`, `src/`, `supabase/`, `proxy.ts`) lên repository GitHub.
2. Giữ nguyên cấu trúc thư mục và `package-lock.json`; không đưa `node_modules`, `.next` hoặc `.env.local` lên GitHub.
3. Vercel Root Directory: `./`; Install Command: `npm ci`; Build Command: `npm run build`.
4. Deploy commit mới và chờ trạng thái `Ready`.
5. Kiểm tra `/login`, `/app`, trang Cá nhân & cài đặt, Workspace members, Kho tài liệu, sản phẩm, RFQ, báo giá và thông báo.

## 6. Phạm vi tiếp theo

Giai đoạn 3 bổ sung xử lý tài liệu bằng AI/OCR, trích xuất RFQ và tự động hóa báo giá/email/DEALSHIELD. Giai đoạn 4 tập trung kiểm thử bảo mật, kiểm thử đầu-cuối, quota, backup và khôi phục. Giai đoạn 5 tập trung onboarding, theo dõi vận hành, gói dịch vụ và thương mại hóa.

Việc tạo ZIP không tự chạy SQL trên Supabase hoặc tự triển khai Vercel. Chỉ nghiệm thu production khi script SQL, build, Auth, RLS, Storage và các thao tác đọc/ghi đã được kiểm tra trên project thực tế.
