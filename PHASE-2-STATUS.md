# TrustiFlow Giai đoạn 2 — tình trạng mã nguồn

## Thành phần đã có trong gói mã nguồn

- Supabase browser/server clients, Next.js Proxy và các API route sử dụng phiên đăng nhập.
- Supabase Auth: đăng ký, xác nhận email, đăng nhập, đăng xuất, quên mật khẩu, cập nhật mật khẩu và khôi phục phiên.
- Hồ sơ người dùng, tự tạo workspace đầu tiên, tạo/chuyển workspace.
- Vai trò Owner/Admin/Member/Reviewer, quản lý thành viên, lời mời bằng link và kiểm soát quyền bằng RLS.
- PostgreSQL gồm dữ liệu người dùng, workspace, đối tác, sản phẩm, giao dịch, tài liệu, phiên bản, extraction, báo giá, rà soát, sai lệch, audit, lời mời và thông báo.
- CRUD hồ sơ sản phẩm; lưu giao dịch RFQ; lưu báo giá vào workspace.
- Supabase Storage private, kiểm tra MIME/dung lượng, signed URL, phiên bản và xóa tài liệu.
- Nhật ký hoạt động, thông báo theo thành viên; menu tài khoản/cài đặt/đăng xuất và căn chỉnh thương hiệu.
- Script SQL bootstrap/phục hồi độc lập tại `supabase/SETUP-PHASE2-PRODUCTION.sql`.

## Việc bắt buộc phải thực hiện và xác minh trên project thực tế

- Chạy script SQL trên Supabase và xác nhận các bảng, policy, trigger, bucket được tạo thành công.
- Chạy `npm ci` và `npm run build` trên môi trường build có đầy đủ dependency.
- Deploy commit mới lên Vercel, xác nhận deployment `Ready`.
- Kiểm thử Auth, reset password, session, workspace/membership, lời mời, các vai trò, CRUD sản phẩm/giao dịch/báo giá, Storage và notifications.
- Kiểm thử RLS bằng ít nhất hai tài khoản ở hai workspace khác nhau.

## Phạm vi các giai đoạn sau

AI/OCR, trích xuất RFQ tự động, phân tích tài liệu, tự động hóa báo giá/email và đối chiếu chứng từ DEALSHIELD thuộc Giai đoạn 3. Kiểm thử an ninh, reliability, backup/restore và kiểm thử đầu-cuối thuộc Giai đoạn 4. Onboarding, billing và vận hành thương mại thuộc Giai đoạn 5.

Không thể xác nhận Giai đoạn 2 trên Production chỉ từ việc tạo ZIP. Chỉ nghiệm thu sau khi SQL, build, deploy và kiểm thử live đều đạt.
