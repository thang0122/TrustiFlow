# TrustiFlow — triển khai Phase 2

Gói này tích hợp xác thực Supabase, hồ sơ, workspace, quyền thành viên được giới hạn theo RLS, lời mời bằng liên kết, nhật ký hoạt động và kho tài liệu riêng tư. Đây là phần nền tảng nghiệp vụ; các màn hình RFQ, báo giá, trích xuất và DEALSHIELD vẫn còn thành phần demo/bản nháp, AI xử lý chứng từ thuộc Phase 3.

## 1. Cấu hình Environment Variables trên Vercel

Trong Vercel → Project → Settings → Environment Variables, thêm cho Production (và Preview/Development nếu sử dụng):

```env
NEXT_PUBLIC_SUPABASE_URL=https://estabmwikpblktxeddvc.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_lBHa_tVEoUV4Hwg3ISWdSw_pVcSxnEx
```

Đây là hai giá trị public/publishable. Không thêm Database password hoặc Supabase Secret key vào trình duyệt, GitHub hay ZIP. Không tạo biến có tiền tố `NEXT_PUBLIC_` cho bất kỳ secret nào. Sau khi lưu biến môi trường, phải redeploy Vercel.

## 2. Chạy SQL migrations theo thứ tự

Mở Supabase Dashboard → SQL Editor → New query.

1. Chạy toàn bộ `supabase/migrations/202611180001_initial_saas.sql`.
2. Sau khi migration 001 chạy thành công, chạy tiếp toàn bộ `supabase/migrations/202611180002_phase2_completion.sql`.
3. Chạy tiếp migration `supabase/migrations/202611180003_document_versions.sql` để bật số phiên bản hiện tại cho tài liệu.
4. Chạy `supabase/migrations/202611180004_membership_security_hardening.sql` để khóa quyền INSERT trực tiếp và ngăn tự cấp Owner. Migration 004 có thể chạy lại an toàn.
5. Kiểm tra Table Editor có các bảng: `profiles`, `workspaces`, `workspace_members`, `counterparties`, `products`, `transactions`, `documents`, `document_versions`, `extractions`, `quotations`, `document_reviews`, `discrepancies`, `audit_events`, `workspace_invitations`.
6. Storage phải có bucket `trade-documents` ở chế độ Private, giới hạn 20 MB/tệp.

Nếu trước đó đã chạy migration 001 và 002, không chạy lặp lại hai file đó; chạy migration 003 nếu chưa có cột `current_version`, sau đó chạy migration 004. Nếu đã chạy migration 003 thì chỉ cần chạy migration 004. Nếu migration cũ chạy dở và báo lỗi, dừng lại, không chạy lặp lại toàn bộ một cách tùy tiện. Không chạy riêng `supabase/schema.sql`; file này chỉ dẫn tới bộ migrations chuẩn.

## 3. Cấu hình Supabase Auth

Supabase Dashboard → Authentication → URL Configuration:

- Site URL: `https://trusti-floww-xxb5.vercel.app` (hoặc domain production hiện đang dùng).
- Redirect URLs: thêm `https://trusti-floww-xxb5.vercel.app/auth/callback` và `http://localhost:3000/auth/callback`.
- Nếu domain Vercel thay đổi, thêm callback URL của domain mới.
- Bật Email confirmation theo chính sách của project. Để gửi email ổn định khi chạy production, cấu hình SMTP riêng trong Supabase Auth; không nên dựa vào giới hạn email mặc định cho người dùng thật.

## 4. Chức năng có thể kiểm tra sau khi deploy

1. Mở `https://trusti-floww-xxb5.vercel.app/login` để đăng nhập hoặc đăng ký.
2. Đăng ký yêu cầu xác nhận email; callback hoàn tất xác thực.
3. Có chức năng quên mật khẩu và đặt mật khẩu mới.
4. Sau đăng nhập, API tạo workspace cá nhân nếu tài khoản chưa có workspace. Menu workspace ở thanh bên cho phép chuyển đổi và tạo workspace mới.
5. Trong Cá nhân & cài đặt, Owner/Admin xem danh sách thành viên, đổi vai trò theo giới hạn quyền, tạo lời mời và sao chép liên kết.
6. Người được mời phải đăng nhập bằng đúng địa chỉ email được mời; liên kết hết hạn sau 7 ngày. Hiện hệ thống tạo liên kết để người quản trị gửi thủ công, chưa tự gửi email invitation. Membership không cho phép client tự INSERT hoặc tự cấp quyền Owner; lời mời được xác nhận qua RPC kiểm tra email đăng nhập.
7. Kho tài liệu tải trực tiếp lên Supabase Storage private (PDF, Word, Excel, PNG, JPG, WEBP; tối đa 20 MB/tệp), có lịch sử phiên bản và xóa cả bản cũ khi xóa tài liệu. Tệp chỉ được truy cập trong workspace theo RLS.
8. Nhật ký hoạt động được ghi vào `audit_events`.

## 5. GitHub → Vercel

1. Giải nén ZIP và đưa toàn bộ nội dung ở cấp gốc (package.json, src/, supabase/, proxy.ts) lên repository GitHub mới; không tạo thư mục bọc.
2. Giữ nguyên `package.json` và `package-lock.json`; không đưa `node_modules`, `.next` hoặc `.env.local` lên GitHub.
3. Vercel → Deployments: triển khai commit mới. Build command: `npm run build`.
4. Đặt Root Directory trên Vercel là `./`. Sau deploy, kiểm tra `/login`, đăng ký, email callback, đăng nhập, trang Cá nhân, tạo lời mời và tải thử tệp không nhạy cảm.

## 6. Giới hạn và an toàn

- Không có Supabase Secret key trong gói này; các API hoạt động bằng session của người dùng và RLS.
- Lời mời chưa được gửi email tự động; cần copy link và gửi cho người được mời.
- Không dùng dữ liệu doanh nghiệp nhạy cảm trước khi hoàn tất kiểm thử RLS giữa hai tài khoản/workspace khác nhau và kiểm tra chính sách lưu trữ/xóa.
- Phase 2 không bao gồm xử lý Gemini/OCR thật. Các màn hình phân tích RFQ, báo giá và DEALSHIELD còn bản nháp/demo và cần Phase 3 để kết nối dữ liệu nghiệp vụ hoàn chỉnh.
- Hoàn tất mã nguồn không đồng nghĩa website live đã được nâng cấp: migration Supabase và redeploy Vercel là hai thao tác bắt buộc trước khi xác nhận nghiệm thu.
